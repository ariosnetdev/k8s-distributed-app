import { Pod } from '../../kubeapi'
import { Layout } from '../DefaultLayout'

type HomeProps = {
    pods: Pod[]
    self: string
}

const Status = (props: {
    podStatus: string
}) => {
    let classes = ""
    const podStatus = props.podStatus
    switch (podStatus) {
        case "Running": {
            classes = "bg-green-900/50 text-green-400 border-green-800"
            break
        }

        case "Pending": {
            classes = "bg-yellow-900/50 text-yellow-400 border-yellow-800"
            break
        }
        default: {
            classes = "bg-red-900/50 text-red-400 border-red-800"
        }

    }

    return (<span class={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${classes}`}>
        {podStatus}
    </span>)
}

export const PodsList = (props: {
    pods: Pod[],
    self: string
}) => <> {props.pods.map(pod => {
        return (
            <tr class="hover:bg-gray-700/50 transition-colors">
                <td class="px-6 py-4 text-sm font-medium text-gray-200">
                    {pod.metadata.name} {pod.metadata.name === props.self ? <span>(self)</span>: null}
                </td>
                <td class="px-6 py-4 text-sm text-gray-400">
                    {pod.status.podIP}
                </td>
                <td class="px-6 py-4 text-sm text-gray-400">
                    ???
                </td>
                <td class="px-6 py-4">
                    <Status podStatus={pod.status.phase} />
                </td>
            </tr>
        )
    })}</>

export const Home = (props: HomeProps) => {
    return (
        <Layout title={'Home'} extraJs={['/static/js/home.js']}>
            <main class="container mx-auto">
                <div class="rounded-lg border border-gray-700 bg-gray-800 shadow-xl">
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead>
                                <tr class="border-b border-gray-700 bg-gray-800/50">
                                    <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                                        Pod Name
                                    </th>
                                    <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                                        Pod IP
                                    </th>
                                    <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                                        Last Heartbeat
                                    </th>
                                    <th class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">
                                        Connected
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-700" id="table-body">
                                <PodsList pods={props.pods} self={props.self}/>
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </Layout>
    )
}
