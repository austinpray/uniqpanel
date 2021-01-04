// TODO: fetch doesn't support upload progress
// just write your own XHR client that does uploads and save 40+kb
import axios from "./vendor/axios/axios@0.21.1/axios.js"

/** @param {HTMLFormElement} form */
export function fileUploadForm(form) {
    

    form.addEventListener('submit', submitForm)

    /** @type {HTMLInputElement} */
    const fileInput = form.querySelector('#file')

    form.addEventListener('change', e => {
        handleInputChange(e)
    })

    form.addEventListener('reset', (e) => {
        window.setTimeout(() => render(e.target, {state: 'step1'}), 0)
    })

    /*form.querySelectorAll("[type=reset]").forEach(el => {
        el.addEventListener('click', e => {
            if (!confirm("Are you sure?")) {
                e.preventDefault()
            }
        })
    })*/

    render(form)
}

/** @param {HTMLFormElement} form */
function render(form, args = {}) {
    const {
        state = null,
        error = "",
        uploading = false,
        successMsg = "",
        uploadProgess = 0,
        result = null,
    } = args
    if (state === null) {
        let currentState = form.dataset.state
        if (!currentState) {
            currentState = "step1"
        }
        return render(form, {...args, state: currentState})
    }
    const step1 = form.querySelector("[data-state=step1]")
    const step2 = form.querySelector("[data-state=step2]")
    const fileInput = form.querySelector("[name=file]")
    const submitButton = form.querySelector('[type=submit]')
    const progress = form.querySelector('.progress')
    const errorEl = form.querySelector('.error')

    form.dataset.state = state

    form.querySelectorAll("[data-state]").forEach(el => {
        if (el.dataset.state === state) {
            el.style.display = "block"
            return
        }

        el.style.display = "none"
    })

    switch (state) {
    case "step1":
        break;
    case "step2":
        break;
    case "finished":
        break;
    }

    const file = fileInput.files[0]
    if (file) {
        form.querySelectorAll("[data-file-attr]").forEach(e => {
            e.textContent = file[e.dataset.fileAttr]
        })
    }
    if (result) {
        form.querySelectorAll("[data-result-attr]").forEach(e => {
            e.textContent = result[e.dataset.resultAttr]
        })
    }

    if (error) {
        errorEl.style.display = "block"
        errorEl.textContent = error
    } else {
        errorEl.style.display = "none"
        errorEl.textContent = ""
    }

    if (uploading) {
        submitButton.disabled = true
        if (!submitButton.dataset.origText) {
            submitButton.dataset.origText = submitButton.textContent
        }
        if (successMsg) {
            submitButton.textContent = successMsg
            submitButton.classList.remove("a-pulsing")
        } else {
            submitButton.textContent = uploadProgess === 100 ? "Analyzing..." : "Uploading..."
            submitButton.classList.add("a-pulsing")
        }

        progress.style.display = "block"
        progress.querySelector('.progress-bar').style.width = `${uploadProgess}%`
    } else {
        if (submitButton.dataset.origText) {
            submitButton.textContent = submitButton.dataset.origText
        }
        submitButton.classList.remove("a-pulsing")
        submitButton.disabled = !form.checkValidity()

        progress.style.display = "none"
    }
}


function handleInputChange(e) {
    const input = e.target
    const form = input.closest("form")
    switch (input.name) {
    case "file":
        /** @type {File} */
        const file = input.files[0]

        if (!file) {
            render(form, {state: "step1"})
            return
        }

        // max file size is 2GiB
        if (file.size > (2 * 2**30)) {
            input.setCustomValidity("Files must be under 2GiB, friend")
            input.reportValidity()
            return
        }

        render(form, {state: "step2"})

        input.setCustomValidity("")
        return
    }
}

/** @param {Event} e */
function submitForm(e) {
    e.preventDefault()

    const form = e.target

    const data = new FormData(form)

    render(form, {uploading: true})

    axios
        .post(form.action, data, {
            onUploadProgress: function (progressEvent) {
                // Do whatever you want with the native progress event
                if (!progressEvent.lengthComputable) {
                    return
                }
                const {loaded, total} = progressEvent
                render(form, {
                    uploading: true,
                    uploadProgess: Math.round((loaded/total) * 100)
                })
            },
        })
        .then(function (resp) {
            render(form, {
                uploading: true,
                uploadProgess: 100,
                successMsg: "Done!"
            })
            // delay 1 second incase file uploda is instant
            window.setTimeout(() => {
                render(form, {
                    state: 'finished',
                    result: resp.data.file,
                })
            }, 1000)
        })
        .catch(function (error) {
            let errorMsg = "something went wrong! try again?"
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.log(error.response.data);
                console.log(error.response.status);
                console.log(error.response.headers);
                if (error.response.data.error) {
                    errorMsg = error.response.data.error
                }
                render(form, {
                    uploading: false,
                    error: errorMsg,
                })
                return
            }
            if (error.request) {
                // The request was made but no response was received
                // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                // http.ClientRequest in node.js
                console.log(error.request);
                render(form, {
                    uploading: false,
                    error: errorMsg,
                })
                return
            }

            console.log('Error', error.message);
            render(form, {
                uploading: false,
                error: errorMsg,
            })
        });
}
