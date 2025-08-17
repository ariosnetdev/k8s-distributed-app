import {expect, test} from "bun:test"
import { PCM } from "./PodConnectionManager"
import { IKubeApi, PodsListJson, Metadata, Pod } from "./kubeapi"
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

test("delete a pod", async() => {
    const watcher = new CustomPodWatcher()
    const kubeApi = new CustomKubeApi()
    const pcm = new PCM(kubeApi, watcher, "")
    await pcm.start()

    // we are simulating a delete with the first pod in the list
    const deletedPod = pcm.getActivePods()[0]

    expect(deletedPod).toBeDefined()

    // new pods start off 'pending'
    const newPod = Pod.withOpts({
        name: "new-pod",
        phase: "Pending"
    })

    watcher.sendEvent(
        WatchEvent.withValues(
            "MODIFIED",
            deletedPod
        ))

    watcher.sendEvent(
        WatchEvent.withValues(
            "ADDED",
            newPod
        )
    )

    watcher.sendEvent(
        WatchEvent.withValues(
            "MODIFIED",
            newPod
        )
    )

    watcher.sendEvent(
        WatchEvent.withValues(
            "MODIFIED",
            newPod.updatePhase("Running")
        )
    )

    watcher.sendEvent(
        WatchEvent.withValues(
            "MODIFIED",
            deletedPod.updatePhase("Failed")
        ))
    

    watcher.sendEvent(
        WatchEvent.withValues(
            "DELETED",
            deletedPod.updatePhase("Failed")
        ))

    expect(pcm.getActivePods()).toHaveLength(2)
})

test("adding a pod", async() => {
    const watcher = new CustomPodWatcher()
    const kubeApi = new CustomKubeApi()
    const pcm = new PCM(kubeApi, watcher, "")
    await pcm.start()

    // we are simulating a delete with pod name "one"
    const newPod = Pod.withOpts({
        name: "new-pod",
        phase: "Pending"
    })

    watcher.sendEvent(
        WatchEvent.withValues(
            "MODIFIED",
            newPod
        ))

    watcher.sendEvent(
        WatchEvent.withValues(
            "ADDED",
            newPod
        )
    )

    watcher.sendEvent(
        WatchEvent.withValues(
            "MODIFIED",
            newPod.updatePhase("Running")
        )
    )

    expect(pcm.getActivePods()).toHaveLength(3)
})

test("removing a pod / scaling down the deployment", async() => {
    const watcher = new CustomPodWatcher()
    const kubeApi = new CustomKubeApi()
    const pcm = new PCM(kubeApi, watcher, "")
    await pcm.start()

    const removedPod = pcm.getActivePods()[0]

    expect(removedPod).toBeDefined()
    expect(removedPod.status.phase === "Running")

    watcher.sendEvent(
        WatchEvent.withValues(
            "MODIFIED",
            removedPod
        ))

    watcher.sendEvent(
        WatchEvent.withValues(
            "MODIFIED",
            removedPod.updatePhase("Failed")
        )
    )

    watcher.sendEvent(
        WatchEvent.withValues(
            "DELETED",
            removedPod.updatePhase("Failed")
        )
    )

    expect(pcm.getActivePods()).toHaveLength(1)

    const secondRemovePod = pcm.getActivePods()[0]
    expect(secondRemovePod).toBeDefined()

    watcher.sendEvent(
        WatchEvent.withValues(
            "MODIFIED",
            secondRemovePod
        ))

    watcher.sendEvent(
        WatchEvent.withValues(
            "MODIFIED",
            secondRemovePod.updatePhase("Failed")
        )
    )

    watcher.sendEvent(
        WatchEvent.withValues(
            "DELETED",
            secondRemovePod.updatePhase("Failed")
        )
    )

    expect(pcm.getActivePods()).toHaveLength(0)
})
