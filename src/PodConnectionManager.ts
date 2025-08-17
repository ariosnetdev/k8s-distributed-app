import { IKubeApi, KubeApi, Pod } from "./kubeapi";
import { IPodWatcher, PodWatcher, type WatchEvent } from "./PodWatcher"

class PCM {
    pods = new Map<string, Pod>()

    public constructor(
        readonly api: IKubeApi,
        readonly watcher: IPodWatcher = new PodWatcher(api),
        readonly podIp = ""
    ) {}

    getActivePods()  {
        return Array.from(this.pods.values())
    }

    async start() {
        // get the initial pod list
        let podList = await this.api.getPodsJson()

        podList
            .items
            .filter((item: Pod) => item.status.phase === "Running")
            .forEach((item: Pod) => {
                this.pods.set(item.metadata.name, new Pod(item.status, item.metadata))
            });

        this.watcher.registerHandler(this.getEventHandler())
        this.watcher.start()
        this.heartbeat()
    }

    async heartbeat() {

        // every 5 seconds let's get a status from our friends
        setInterval(() => {
            // this.pods == all the active ones (phase == "Running"
            // while this.allPods == everything returned from the api
            Array.from(this.pods.values()).forEach(item => {

                if(item.status.podIP !== this.podIp) {

                    fetch(`http://${item.status.podIP}:3000/pods`)
                    .then(async(response) => {

                        if(response.status !== 200) {
                            console.log(response.statusText)
                        }

                        //console.log(`hearbeat response from friend with IP: ${item.status.podIP}, status: ${response.status}`)

                        return response.json()
                    }).catch(err => {
                        if(err instanceof Error) {
                            console.log(`ERROR: when calling pod by ip: ${item.status.podIP} ${err.message}`)
                        }
                    })
                }
            })

        }, 5000)
    }


    getEventHandler() {
        // *this* below refers to our current instance of PCM
        return (e: WatchEvent) => {

            console.log(`PCM: event received from the watch of type: ${e.type}`) 

            const obj = e.object
            const pod = this.pods.get(obj.metadata.name)
            // if we do have this pod remove it
            if(e.type === "DELETED" && pod) {
                this.pods.delete(obj.metadata.name)
            }

            if (e.type === "ADDED" && !pod) {
                if(obj.status?.phase === "Running") {
                    this.pods.set(obj.metadata.name, new Pod(obj.status, obj.metadata))
                }
            }

            if (e.type === "MODIFIED") {  
                if(obj.status?.phase === "Running") {
                    // just write over the guy if he exist?
                    this.pods.set(obj.metadata.name, new Pod(obj.status, obj.metadata))
                } else {
                    this.pods.delete(obj.metadata.name)
                }
            }

        }
    }
}


export {
    PCM
}

