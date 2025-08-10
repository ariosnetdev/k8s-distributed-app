const eventSource = new EventSource("/events")
eventSource.addEventListener('message', (event) => {
    try {
        const json = JSON.parse(event.data)

        const tbody = document.querySelector("#table-body")
        console.log(json.pods)

        if(tbody != null) {
            tbody.innerHTML = json.pods
        }

    } catch(ex) {
        alert(ex)
    } 
})
