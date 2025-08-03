import { Hono } from 'hono'
import { readFileSync } from "node:fs"
import { KubeApi } from './kubeapi'
import { PodWatcher } from './PodWatcher'

const app = new Hono()

const serverEvents: any[] = []

type ActivePod = {
    ip: string
    name: string
}

// active pods is a dictionary of pod name => ActivePod
const activePods = new Map<string, ActivePod>()

let token = ""

try {
    token = readFileSync("/var/run/secrets/kubernetes.io/serviceaccount/token", "utf-8")
} catch(err) {
    if(err instanceof Error) {
        console.log(`ERROR: could not get the token: ${err.message}\n${err.stack}`)
    }

    process.exit(1)
}

const api = new KubeApi(token, "myapp")

let podList = await api.getPodsJson()

    // add the initial podlist (of running pods to the active pods listPods    
    podList
    .items
    .filter((item: any) => item.status.phase === "Running")
    .forEach((item: any) => {
        activePods.set(item.metadata.name, {
            name: item.metadata.name,
            ip: item.status.podIP
        })
    });


    // don't need to wait this as we will get updates / events as things change
const watcher = new PodWatcher(api, 
(event: any) => {

    console.log(`event received from the watch of type: ${event.type}`) 

    const obj = event.object
    const pod = activePods.get(obj.metadata.name)

    // do nothing if we don't have this pod
    if(event.type === "DELETED" && !pod) return
    // if we do have this pod remove it
    if(event.type === "DELETED" && pod) {
        activePods.delete(obj.metadata.name)
        return 
    }

    if (event.type === "ADDED" && !pod) {
        if(obj.status?.phase === "Running") {
            activePods.set(obj.metadata.name, {
                name: obj.metadata.name,
                ip: obj.status.podIP
            })
        }

        return
    }

    if (event.type === "MODIFIED") {  
        if(obj.status?.phase === "Running") {
            // just write over the guy if he exist?
            activePods.set(obj.metadata.name, {
                name: obj.metadata.name,
                ip: obj.status.podIP
            })
        } else {
            activePods.delete(obj.metadata.name)
        }

        return
    }

    if (event.type === "ADDED" && !pod) {
        if(obj.status?.phase === "Running") {
            activePods.set(obj.metadata.name, {
                name: obj.metadata.name,
                ip: obj.status.podIP
            })
        }

        // keep return here if we ever start adding more cases
        return
    }
})

watcher.start()

app.get('/active', async (c) => {

    return c.json({
        pods: Object.fromEntries(activePods)
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
