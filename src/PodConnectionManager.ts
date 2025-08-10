import { KubeApi, Pod } from "./kubeapi";
import { IPodWatcher, PodWatcher, type WatchEvent } from "./PodWatcher"

class PCM {
    pods = new Map<string, Pod>()
    allPods = new Map<string, Pod>()

    public constructor(
        readonly api: KubeApi,
        readonly watcher: IPodWatcher = new PodWatcher(api),
        readonly podIp = ""
    ) {}

    getActivePods()  {
        return Array.from(this.pods.values())
    }

    getAllPods()  {
        return Array.from(this.allPods.values())
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
        //this.heartbeat()
    }

    async heartbeat() {

        // every 5 seconds let's get a status from our friends
        setInterval(() => {
            Array.from(this.pods.values()).forEach(item => {

                if(item.status.podIP !== this.podIp) {

                    fetch(`http://${item.status.podIP}:3000/`)
                    .then(async(response) => {

                        if(response.status !== 200) {
                            console.log(response.statusText)
                        }

                        return response.json()
                    }).then(json => {

                        console.log(`reponse from friend with IP of: ${item.status.podIP} was ${JSON.stringify(json, null, 4)}`)
                    }).catch(err => {
                        if(err instanceof Error) {
                            console.log(`ERROR: when calling pod by ip: ${item.status.podIP} ${err.message}`)
                        }
                    })
                }
            })

        }, 5000)
    }


    async updateAllPods() {
        const json = await this.api.getPodsJson()

        json.items.forEach(pod => {
            this.allPods.set(pod.metadata.name, pod)
        })
    }

    getEventHandler() {
        // *this* below refers to our current instance of PCM
        return (e: WatchEvent) => {

            console.log(`event received from the watch of type: ${e.type}`) 

            const obj = e.object
            const pod = this.pods.get(obj.metadata.name)
            // do nothing if we don't have this pod
            if(e.type === "DELETED" && !pod) return
            // if we do have this pod remove it
            if(e.type === "DELETED" && pod) {
                this.pods.delete(obj.metadata.name)
                return 
            }

            if (e.type === "ADDED" && !pod) {
                if(obj.status?.phase === "Running") {
                    this.pods.set(obj.metadata.name, new Pod(obj.status, obj.metadata))
                }

                return
            }

            if (e.type === "MODIFIED") {  
                if(obj.status?.phase === "Running") {
                    // just write over the guy if he exist?
                    this.pods.set(obj.metadata.name, new Pod(obj.status, obj.metadata))
                } else {
                    this.pods.delete(obj.metadata.name)
                }

                return
            }

        }
    }
}


export {
    PCM
}

