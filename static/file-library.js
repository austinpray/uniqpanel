
const numFormat= new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2
})

async function getJSON(url) {
    const response = await fetch(url, {
        credentials: 'same-origin'
    });
    if (![200, 201].includes(response.status)) {
        const err = new Error(response.statusText)
        err.response = response
        throw err
    }
    return response.json()
}

/** @param {HTMLDivElement} app */
export async function fileLibrary(app, {flags}) {
    const loader = app.querySelector("[data-loader]")
    const flashError = app.querySelector("[data-flash-error]")

    async function loadFiles({flags}) {
        loader.style.display = "block"
        flashError.style.display = "none"
        let files = null
        try {
            const response = await getJSON(`/app/api/files${flags}`)
            files = response.files
        } catch (error) {
            console.error(error);
            flashError.style.display = "block"
        }
        loader.style.display = "none"
        return files
    }

    const fileList = app.querySelector("[data-file-list]")
    const searchInput = app.querySelector('[data-search-input]')
    const defaultPageSize = 16
    const showMoreBtn = app.querySelector('[data-show-more]')
    const selectAllCheck = app.querySelector('[data-select-all]')
    const numSelectedEl = app.querySelector('[data-num-selected]')
    const analyzeBtn = app.querySelector('[data-analyze-button]')
    let currentPageSize = defaultPageSize

    const files = await loadFiles({flags})
    if (files === null) {
        return
    }
    if (files.length === 0) {
        app.querySelector('[data-no-files-yet]').style.display = "block"
        searchInput.disabled = true
        return
    }


    // set up initial state
    const initialParams = new URLSearchParams(window.location.search);
    const initialIds = initialParams.getAll('id').map(i => parseInt(i, 10))
    files.forEach((file, i) => {
        const f = FileCard({file})

        // TODO: this is client-side pagination lmao
        if (i >= defaultPageSize) {
            f.style.display = "none"
        }
        if (initialIds.includes(file.id))  {
            f.querySelector('[data-analyze-check').checked = true
        }
        fileList.appendChild(f)
    })

    function filterCards({search = null, pageSize = defaultPageSize}) {
        if (search === null) {
            search = getSearch()
        }
        const searchTokens = search.split(/\s+/)
        let matches = 0
        fileList.querySelectorAll('.file-card').forEach(fileCard => {
            const show = matches < pageSize
            const isMatch = searchTokens.every(t => fileCard.dataset.searchString.includes(t))
            if (isMatch) {
                matches++
            }
            fileCard.style.display = (show && isMatch) ? "block" : "none"
        })
        return matches
    }
    
    function getSearch(el = searchInput) {
        return el.value.toLowerCase()
    }
    function showMoreBtnState(totalItems) {
        showMoreBtn.style.display = currentPageSize <= totalItems ? 'inline-block' : 'none'
    }


    showMoreBtnState(fileList.querySelectorAll('.file-card').length)

    searchInput.addEventListener('input', e => {
        const search = getSearch(e.target)
        currentPageSize = defaultPageSize
        const numShown = filterCards({
            search,
            pageSize: currentPageSize,
        })
        showMoreBtnState(numShown)
    })

    showMoreBtn.addEventListener('click', e => {
        currentPageSize += defaultPageSize
        const numShown = filterCards({
            pageSize: currentPageSize,
        })
        showMoreBtnState(numShown)
    })

    function toggleCardSelected({card = null, selectAll = null} = {}) {
        const cards = fileList.querySelectorAll('.file-card')
        let numSelected = 0
        cards.forEach(fileCard => {
            const checkbox = fileCard.querySelector('[data-analyze-check]')
            if (selectAll != null) {
                checkbox.checked = selectAll
            }
            if (checkbox.checked) {
                numSelected++
            }
        })
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.delete('id')

        cards.forEach(fileCard => {
            const checkbox = fileCard.querySelector('[data-analyze-check]')
            if (checkbox.checked) {
                urlParams.append('id', fileCard.dataset.fileId)
            }
            fileCard.dataset.selected = checkbox.checked
        })
        let query = urlParams.toString()
        window.history.replaceState(null, '', `?${query}`);

        numSelectedEl.textContent = numSelected
        analyzeBtn.disabled = numSelected === 0
        selectAllCheck.checked = numSelected === cards.length
        selectAllCheck.indeterminate = numSelected > 0 && numSelected < cards.length
    }
    
    toggleCardSelected()

    // event bubbling
    app.addEventListener('input', e => {
        if (e.target.type === "checkbox" && e.target.dataset.analyzeCheck) {
            toggleCardSelected({
                card: e.target
            })
        }
    })
    selectAllCheck.addEventListener('input', e => toggleCardSelected({
        selectAll: e.target.checked
    }))

    for (let inputEl of [searchInput, selectAllCheck]) {
        inputEl.disabled = false
    }

}

const dtFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function FileCard({file}) {
    file.displayDate = dtFormat.format(new Date(file.createdAt))

    const el = document.createElement('div')
    el.className = "file-card"
    el.id = `file-card-${file.id}`
    el.dataset.fileId = file.id
    el.dataset.searchString = `${file.displayName.toLowerCase()}-${file.fileName.toLowerCase()}`
    el.innerHTML = `
    <h4 class="file-card-title">
        <label>
        <input type="checkbox" name="id" data-analyze-check=":^)" aria-label="Analyze File">
        <span data-fileobj-attr="displayName">$DISPLAY</span><br>
        <small class="btw"><code data-fileobj-attr="fileName">$FN</code></small>
        </label>
    </h4>
    <dl>
        <dt>Unique lines</dt>
        <dd>
            <span data-fileobj-attr="uniqueLines">$X</span>
            <span class="btw"> / <span data-fileobj-attr="totalLines">$X</span>
        </dd>
        <dt>Uploaded</dt>
        <dd data-fileobj-attr="displayDate">$X</dd>
        </dd>
        <dt>Size</dt>
        <dd data-fileobj-attr="fileSizeDisplay">$X</dd>
        </dd>
        <dt>Analysis time</dt>
        <dd>
            <span data-fileobj-attr="elapsedTimeDisplay">$X</span>
            <br>
            <span class="btw">
                <span data-fileobj-attr="elapsedTimeNs">$X</span> ns
            </span>
        </dd>
    </dl>
    `

    for (let prop of ['totalLines', 'uniqueLines', 'elapsedTimeNs']) {
        file[prop] = numFormat.format(file[prop])
    }

    el.querySelectorAll("[data-fileobj-attr]").forEach(e => {
        e.textContent = file[e.dataset.fileobjAttr]
    })

    el.querySelector('[data-fileobj-attr=displayDate]').setAttribute('title', file.createdAt)

    if (file.displayName == file.fileName) {
        el.querySelector('.file-card-title small').style.display = 'none'
    }
    el.querySelector('[data-analyze-check]').value = file.id
    return el
}
