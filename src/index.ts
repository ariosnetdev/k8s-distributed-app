import { Hono } from 'hono'
import { readFileSync } from "node:fs"
import { KubeApi } from './kubeapi'
import { PodWatcher } from './PodWatcher'
import { PCM } from './PodConnectionManager'

const app = new Hono()
const serverEvents: any[] = []

let token = ""

try {
    token = readFileSync("/var/run/secrets/kubernetes.io/serviceaccount/token", "utf-8")
} catch(err) {
    if(err instanceof Error) {
        console.log(`WARN: could not get the token from kubeapi (are we running in k8s?): ${err.message}`)
    }
}

const api = new KubeApi(token, "myapp")
const watcher = new PodWatcher(api)
const pcm = new PCM(api, watcher)

pcm.start()

app.get('/active', async (c) => {

    return c.json({
        pods: pcm.getActivePods()
    })
})
app.get('/', async (c) => {

    return c.json({
        // @ts-ignore
        pods: globalPodList
    })
})

app.get('/events', async (c) => {

    return c.json({
        // @ts-ignore
        events: serverEvents
    })
})

export default app
