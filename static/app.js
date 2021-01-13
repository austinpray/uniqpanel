/*
POV: alternate reality where
- modern browsers and ES modules exist
- webpack, npm, and react don't exist.

This basically makes the js codebase "terrible" and reminiscent of the old
jQuery days. But end-users will thank you for putting up with this cruft,
seeing as though the whole app fits in less than 10KiB of JS.
*/

const fileUploadFormEl = document.getElementById("fileUpload")
if (fileUploadFormEl) {
    import('./file-uploader.js')
        .then(({fileUploadForm}) => {
            fileUploadForm(fileUploadFormEl)
        });
}

const libraryEl = document.getElementById("fileLibrary")
if (libraryEl) {
    import('./file-library.js')
        .then(({fileLibrary}) => {
            fileLibrary(libraryEl, {flags: window.location.search})
        });
}

document.querySelectorAll('.plz-subscrib').forEach(el => {
    el.addEventListener("click", (e) => {
        e.preventDefault();
        const meme = e.target.parentNode.querySelector('.meme');
        if (!meme) {
            return
        }
        meme.volume = 0.1
        meme.style.display = 'block';
        meme.scrollIntoView(true)
        meme.play();
    });
})
