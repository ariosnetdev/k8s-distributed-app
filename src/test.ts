
class Data {
    constructor(
        readonly value = ""
    ){}
}

class Help {
    constructor(
        readonly test = new Data()
    ) {}
}



const lastHeartbeat = Math.floor((Date.now() / 1000) - 10)

setInterval(() => {
    const current = Math.floor(Date.now() / 1000)

    console.log(`diff between last and now is: ${current - lastHeartbeat}`)
}, 500)
