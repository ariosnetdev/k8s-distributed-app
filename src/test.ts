
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

console.log(JSON.stringify(new Help()))
console.log(JSON.stringify(new Help(
    new Data("test")
)))
