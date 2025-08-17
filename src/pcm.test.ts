import {expect, test} from "bun:test"
import { PCM } from "./PodConnectionManager"
import { IKubeApi, PodsListJson, KubeApi, Metadata, Pod, Status } from "./kubeapi"
import { IPodWatcher, WatchEvent, type EventHandler } from "./PodWatcher"

class CustomPodWatcher implements IPodWatcher {

    private handler: EventHandler = () => {}
    constructor() {}

    registerHandler(h: EventHandler) {
        this.handler = h
    }

    sendEvent(e: WatchEvent) {
        this.handler(e)
    }

    async start() {}
}

class CustomKubeApi implements IKubeApi {

    public podsList: Pod[] = [
        Pod.withOpts({name: "one", ip: "10.0.0.1", phase: "Running"}),
        Pod.withOpts({name: "two", ip: "10.0.0.2", phase: "Running"})
    ]

    async getPodsJson(): Promise<PodsListJson> {

        return new PodsListJson(new  Metadata(), this.podsList)
    }
}

test("startup with 2 pods", async() => {
    const watcher = new CustomPodWatcher()
    const kubeApi = new CustomKubeApi()
    const pcm = new PCM(kubeApi, watcher, "")
    await pcm.start()




    expect(pcm.getActivePods()).toHaveLength(2)
})

test("startup with no pods", async() => {
    const watcher = new CustomPodWatcher()
    const kubeApi = new CustomKubeApi()
    kubeApi.podsList = []
    const pcm = new PCM(kubeApi, watcher, "")
    await pcm.start()

    expect(pcm.getActivePods()).toHaveLength(0)
})




// Event output for a kubectl delete is:
//
// Event: MODIFIED
// Pod Name: myapp-7ff8b696c4-7gm4n
// Pod Status: Running
//
// Event: ADDED
// Pod Name: myapp-7ff8b696c4-5psvd
// Pod Status: Pending
//
// Event: MODIFIED
// Pod Name: myapp-7ff8b696c4-5psvd
// Pod Status: Pending
//
// Event: MODIFIED
// Pod Name: myapp-7ff8b696c4-5psvd
// Pod Status: Pending
//
// Event: MODIFIED
// Pod Name: myapp-7ff8b696c4-5psvd
// Pod Status: Running
//
// Event: MODIFIED
// Pod Name: myapp-7ff8b696c4-7gm4n
// Pod Status: Failed
//
// Event: MODIFIED
// Pod Name: myapp-7ff8b696c4-7gm4n
// Pod Status: Failed
//
// Event: DELETED
// Pod Name: myapp-7ff8b696c4-7gm4n
// Pod Status: Failed
//

test("kubectl delete pod", async() => {
    const watcher = new CustomPodWatcher()
    const kubeApi = new CustomKubeApi()
    const pcm = new PCM(kubeApi, watcher, "")
    await pcm.start()

    // we are simulating a delete with pod name "one"
    watcher.sendEvent({
        type: "MODIFIED",
        object: {
            metadata: {
                name: "one",
                resourceVersion: ""
            },
            status: {
                phase: "Running",
                podIP: ""
            }
        }
    })

    watcher.sendEvent({
        type: "ADDED",
        object: {
            metadata: {
                name: "three ",
                resourceVersion: ""
            },
            status: {
                phase: "Pending",
                podIP: ""
            }
        }
    })


    watcher.sendEvent({
        type: "MODIFIED",
        object: {
            metadata: {
                name: "three ",
                resourceVersion: ""
            },
            status: {
                phase: "Pending",
                podIP: ""
            }
        }
    })

    watcher.sendEvent({
        type: "MODIFIED",
        object: {
            metadata: {
                name: "three ",
                resourceVersion: ""
            },
            status: {
                phase: "Running",
                podIP: ""
            }
        }
    })

    watcher.sendEvent({
        type: "MODIFIED",
        object: {
            metadata: {
                name: "one",
                resourceVersion: ""
            },
            status: {
                phase: "Failed",
                podIP: ""
            }
        }
    })

    watcher.sendEvent({
        type: "DELETED",
        object: {
            metadata: {
                name: "one",
                resourceVersion: ""
            },
            status: {
                phase: "Failed",
                podIP: ""
            }
        }
    })

    expect(pcm.getActivePods()).toHaveLength(2)
})
