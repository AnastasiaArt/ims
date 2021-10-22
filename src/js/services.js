const services = document.querySelectorAll('.services__item--second')
function setDelayInServices(value) {
    services.forEach((i) => {
        i.setAttribute("data-wow-delay",value)
    })
}
function changeDelay() {
    if (window.innerWidth > 1040) {
        setDelayInServices('0.8s')
    } else {
        setDelayInServices('0.4s')
    }
}
module.exports = changeDelay;
