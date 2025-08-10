const eventSource = new EventSource("/events")
eventSource.addEventListener('message', (event) => {
    try {
        const json = JSON.parse(event.data)
        console.log(json.event)
        const tbody = document.querySelector("#table-body")

        if(tbody != null) {
            tbody.innerHTML = json.pods
        }

        const mainContainer = document.querySelector("main.container.mx-auto")

        if(!mainContainer) return
        if(!json.event) return

        const e = json.event
        const div = document.createElement('div')
        div.classList.add("mb-5")
        div.innerHTML = `<p>Event: ${e.type}</p>
            <p>Pod Name: ${e.object.metadata.name}</p>
            <p>Pod Status: ${e.object.status.phase}</p>
        `

        mainContainer.append(div)

    } catch(ex) {
        alert(ex)
    } 
})
