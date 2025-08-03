import { Hono } from 'hono'
import { readFileSync } from "node:fs"

const app = new Hono()
const apiUrl = "https://kubernetes.default.svc"
const podResource = 'api/v1/namespaces/myapp/pods'

const serverEvents = []

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

async function watchPods(resourceVersion: string, evt: (obj: any) => void) {

    if(!resourceVersion) {
        throw new Error("watchPods: resourceVersion needs to be defined")
    }

    const r = new Request(`${apiUrl}/${podResource}?watch=1&resourceVersion=${resourceVersion}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${token}`
        },
    })
    
    const response = await fetch(r)

    if(response.status !== 200) {
        throw new Error("non 200 response from kube api")
    }

    const reader = response.body?.getReader()

    if(!reader) {
        throw new Error("Response did contain a body that we could stream in")
    }

    const decoder = new TextDecoder()
    let done = false
    let result = ""

    while(!done) {
        let readResult = null
        try {
            readResult = await reader.read()
        } catch(e) {
            if(e instanceof Error) {
                console.log(`ERROR: got error trying to read from the stream ${e.message}`)
                console.log(e)
            }

            throw new Error("???")
        }
        done = readResult.done

        if(!readResult.value) {
            continue
        }

        const text = decoder.decode(readResult.value)
        result += text
        try {
            const json = JSON.parse(result)
            result = ""
            serverEvents.push(json)
            evt(json)
        } catch(e) { 
            if (e instanceof Error) {
                console.log(`WARN: failed parsiing with: ${e.message}`)
                console.log(`${e.stack}`)
            }
 
            // if we failed parsing just wait for the next event
            continue
        }
    }

}

async function listPods() {

    const response = await fetch(`${apiUrl}/${podResource}`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    })

    return await response.json()
}


// TODO: just putting the global state here to see
// the structure of the json response in the api call
let globalPodList: any = null

async function go() {

    globalPodList = await listPods()

    // add the initial podlist (of running pods to the active pods listPods    
    globalPodList
    .items
    .filter((item: any) => item.status.phase === "Running")
    .forEach((item: any) => {
        activePods.set(item.metadata.name, {
            name: item.metadata.name,
            ip: item.status.podIP
        })
    });

    // don't need to wait this as we will get updates / events as things change
    watchPods(globalPodList.metadata.resourceVersion, (event: any) => {

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
}

go()

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
