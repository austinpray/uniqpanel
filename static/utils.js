/*
This file is unused :eyes:
*/

export const numFormat= new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2
})

export function nsBreakdown(nanoseconds) {
    const ns = nanoseconds
    const ms = nanoseconds / 1e6
    const s = nanoseconds / 1e9

    let display = `${numFormat.format(ns)} ns`
    const displayMap = {ns, ms, s}

    const entries = Object
        .entries(displayMap)
        .sort((a, b) => a[1] - b[1])
    for (let [si, i] of entries) {
        if (Math.floor(i) > 0) {
            display = `${numFormat.format(i)} ${si}`
            break
        }
    }

    return {ns, ms, s, display}
}
