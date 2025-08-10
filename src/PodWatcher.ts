import {
    type PodDef,
    KubeApi
} from "./kubeapi"

type WatchEvent = {
    type: string,
    object: PodDef
}

type EventHandler = (e: WatchEvent) => void

interface IPodWatcher {
    registerHandler(h: EventHandler): void
    start(): Promise<void>
}

class PodWatcher implements IPodWatcher {

    private handlers: EventHandler[] = []
    private started = false
    constructor(
        private readonly api: KubeApi,
    ) {}

    registerHandler(h: EventHandler) {
        this.handlers.push(h)
    }

    cleanUpHandler(h: EventHandler) {
        this.handlers = this.handlers.filter(item => item !== h)
    }

    notifyHandlers(e: WatchEvent) {
        this.handlers.forEach((h: EventHandler) => h(e))
    }

    async start() {
        if(this.started) {
            return
        }

        this.started = true

        while(true) {
            try {
                await this.watch()
            } catch(e) {
                // we swallow the error and reconnect (it's probably a timeout)
                if(e instanceof DOMException) {
                    continue
                }
                break
            }
        }
    }

    async watch() {
        return new Promise(async(resolve, reject) => {
            // TODO: we have a double call into the getPodsJson at app start
            // add the ability to pass a one time resourceVersion to avoid this
            // probably have to move this call to the `start` method
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
                    this.notifyHandlers(json)
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
    type IPodWatcher,
    type WatchEvent,
    PodWatcher
}
