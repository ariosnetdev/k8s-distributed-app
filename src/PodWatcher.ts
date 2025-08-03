import {
    type PodDef,
    KubeApi
} from "./kubeapi"

type WatchEvent = {
    type: string,
    object: PodDef
}

class PodWatcher {

    constructor(
        private readonly api: KubeApi,
        private handler: (e: WatchEvent) => void
    ) {}

    async start() {
        while(true) {
            try {
                await this.watch()
            } catch(e) {
                console.log(e)
                if(e instanceof DOMException) {
                    continue
                }
                break
            }
        }
    }

    async watch() {
        return new Promise(async(resolve, reject) => {
            const podsList = await this.api.getPodsJson()
            const {body} = await this.api.getWatchPodsResponse(podsList.metadata.resourceVersion)

            const reader = body.getReader()
            const decoder = new TextDecoder()
            let result = ""

            while(true) {
                let readResult = null
                try {
                    readResult = await reader.read()
                } catch(e) {
                    return reject(e)
                }

                const text = decoder.decode(readResult.value)
                result += text
                try {
                    const json = JSON.parse(result)
                    result = ""
                    this.handler(json)
                } catch(e) { 
                    if (e instanceof Error) {
                        console.log(`WARN: failed parsiing with: ${e.message}`)
                    }

                    // if we failed parsing just wait for the next event
                    continue
               }
            }
        })
    }
}


export {
    type WatchEvent,
    PodWatcher
}
