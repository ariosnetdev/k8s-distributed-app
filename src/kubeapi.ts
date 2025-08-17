type PodDef = {
    status: {
        phase: string
        podIP: string
    }
    metadata: {
        name: string
        resourceVersion: string
    }
}
type ListPodsJson = {
    metadata: {
        resourceVersion: string
    }
    items: PodDef[]
}

class KubeApiError extends Error {
    readonly code: number
    readonly path: string
    readonly response: Response
    constructor(message: string, r: Response) {
        super(message)
        this.name = "KubeApiError"
        this.message = message
        this.code = r.status
        this.path = r.url
        this.response = r

        Object.setPrototypeOf(this, KubeApiError.prototype)
    }
}

// ** BEGIN Class Defs **

class Metadata {
    constructor(
        public resourceVersion = "",
        public name = ""
    ) {}
}

class Status {
    constructor(
        public phase = "",
        public podIP = ""
    ) {}
}

type PodCreateOpts = {
    phase?: string
    ip?: string
    name?: string
}

class Pod {
    constructor(
        public status = new Status(),
        public metadata = new Metadata()
    ) {}

    updatePhase(phase: string) {

        this.status.phase = phase
        return this
    }

    static withOpts({
        phase = "",
        ip = "",
        name = ""
    }: PodCreateOpts) {
        return new Pod(new Status(phase, ip), new Metadata("", name))
    }
}


class PodsListJson {
    constructor(
        readonly metadata = new Metadata(),
        readonly items: Pod[] = []
    ) {}
}

// ** END Class Defs **

interface IKubeApi {
    getPodsJson() : Promise<PodsListJson>
}

class KubeApi implements IKubeApi{

    private readonly baseUrl = "https://kubernetes.default.svc"
    private readonly token: string
    private readonly namespace: string
    private readonly podResource: string
    constructor(
        token: string,
        namespace: string,
    ) {

        this.token = token
        this.namespace = namespace
        this.podResource = `${this.baseUrl}/api/v1/namespaces/${this.namespace}/pods`
    }

    async getPodsJson(): Promise<PodsListJson> {

        try {

            const response = await fetch(`${this.podResource}`, {
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            })

            if(response.status !== 200) {
                console.log("WARN: received non 200 response from kubeapi")
                return new PodsListJson()
            }

            const json = await response.json()

            return new PodsListJson(
                json.metadata,
                json.items
            )

        } catch(e) {
            if(e instanceof Error) {
                console.log(`WARN: Error encountered trying to call kubeapi: ${e.message}`)
            }

            return new PodsListJson()
        }
    }

    async getWatchPodsResponse(resourceVersion: string) {

       if(!resourceVersion) {
            throw new Error("Argument Exception: resourceVersion needs to be defined")
        }

        const r = new Request(`${this.podResource}?watch=1&resourceVersion=${resourceVersion}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${this.token}`
            },
        })
    
        const response = await fetch(r)

        if(response.status !== 200 || response.body == null) {
            throw new KubeApiError(
                "non 200 response from kube api or empty body",
                response
            )
        }

        return {
            response,
            body: response.body
        }
    }
}


export {
    type PodDef,
    type IKubeApi,
    PodsListJson,
    Status,
    Metadata,
    Pod,
    KubeApi
}
