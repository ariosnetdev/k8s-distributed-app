import { Hono } from 'hono'
import { readFileSync } from "node:fs"
import { KubeApi } from './kubeapi'
import { PodWatcher, WatchEvent } from './PodWatcher'
import { PCM } from './PodConnectionManager'
import { Home, PodsList } from "./jsx/pages/Home"
import { streamSSE } from "hono/streaming"
import { serveStatic } from 'hono/bun'
import { renderToString } from 'hono/jsx/dom/server'

const app = new Hono()

let token = ""

let namespace = process.env.POD_NAMESPACE ?? ""
let podIP = process.env.POD_IP ?? ""
let podName = process.env.POD_NAME ?? ""

try {
    token = readFileSync("/var/run/secrets/kubernetes.io/serviceaccount/token", "utf-8")
} catch (err) {
    if (err instanceof Error) {
        console.log(`WARN: could not get the token from kubeapi (are we running in k8s?): ${err.message}`)
    }
}

const api = new KubeApi(token, namespace)
const watcher = new PodWatcher(api)
const pcm = new PCM(api, watcher, podIP)

pcm.start()

app.get('/pods', async (c) => {
    return c.json({
        pods: pcm.getActivePods()
    })
})

app.get('/', (c) => c.html(<Home pods={pcm.getActivePods()} self={podName}/>))

app.get('/events', (c) => {
    return streamSSE(c, async (stream) => {
        const { reject, resolve, promise } = Promise.withResolvers()
        const handler = async (e: WatchEvent) => {
            try {
                console.log(`STREAM HANDLER: recieved a watch event of type: ${e.type}`)
                const podsList = pcm.getActivePods()
                await stream.writeSSE({
                    data: JSON.stringify({
                        "event": e,
                        "pods": renderToString(<PodsList pods={podsList} self={podName}/>)
                    })
                })
            } catch (e) {
                console.log("STREAM HANDLER: unhandled exception: ", e)
                reject()
            }
        }

        watcher.registerHandler(handler)
        stream.onAbort(() => {
            watcher.cleanUpHandler(handler)
        })

        const podsList = pcm.getActivePods()
        await stream.writeSSE({
            data: JSON.stringify({
                "pods": renderToString(<PodsList pods={podsList} self={podName}/>)
            })
        })

        await promise
    })
})

app.get(
    '/static/*',
    serveStatic({
        root: './'
    })
)

export default {
    fetch: app.fetch,
    port: 3000,
    idleTimeout: 0
}
