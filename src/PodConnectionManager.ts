import { KubeApi } from "./kubeapi";
import { IPodWatcher, PodWatcher, type WatchEvent } from "./PodWatcher"

class PCMPod {
    constructor(
        name: string = "",
        ip: string = ""
    ) {}
}

class PCM {
    activePods = new Map<string, PCMPod>()

    public constructor(
        readonly api: KubeApi,
        readonly watcher: IPodWatcher = new PodWatcher(api)
    ) {}

    getActivePods()  {
        return Object.fromEntries(this.activePods)
    }

    async start() {

        let podList = await this.api.getPodsJson()

        // add the initial podlist (of running pods to the active pods listPods    
        podList
            .items
            .filter((item: any) => item.status.phase === "Running")
            .forEach((item: any) => {
                this.activePods.set(item.metadata.name, {
                    name: item.metadata.name,
                    ip: item.status.podIP
                })
            });

        this.watcher.registerHandler(this.getEventHandler())
        this.watcher.start()
    }

    getEventHandler() {
        // *this* below refers to our current instance of PCM
        return (e: WatchEvent) => {

            console.log(`event received from the watch of type: ${e.type}`) 

            const obj = e.object
            const pod = this.activePods.get(obj.metadata.name)
            // do nothing if we don't have this pod
            if(e.type === "DELETED" && !pod) return
                // if we do have this pod remove it
                if(e.type === "DELETED" && pod) {
                    this.activePods.delete(obj.metadata.name)
                    return 
                }

                if (e.type === "ADDED" && !pod) {
                    if(obj.status?.phase === "Running") {
                        this.activePods.set(obj.metadata.name, {
                            name: obj.metadata.name,
                            ip: obj.status.podIP
                        })
                    }

                    return
                }

                if (e.type === "MODIFIED") {  
                    if(obj.status?.phase === "Running") {
                        // just write over the guy if he exist?
                        this.activePods.set(obj.metadata.name, {
                            name: obj.metadata.name,
                            ip: obj.status.podIP
                        })
                    } else {
                        this.activePods.delete(obj.metadata.name)
                    }

                    return
                }

                if (e.type === "ADDED" && !pod) {
                    if(obj.status?.phase === "Running") {
                        this.activePods.set(obj.metadata.name, {
                            name: obj.metadata.name,
                            ip: obj.status.podIP
                        })
                    }

                    // keep return here if we ever start adding more cases
                    return
                }
        }
    }
}


export {
    PCM
}

