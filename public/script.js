let htmlFiles = [];
let cssFiles = [];
let jsFiles = [];
let assetFiles = [];

const fetchFiles = () => {
    const urlInput = document.getElementById('urlInput').value.trim();

    if (!urlInput) {
        showToast('Error: Please enter a URL', 'error');
        return;
    }

    if (!urlInput.startsWith('http://') && !urlInput.startsWith('https://')) {
        urlInput = 'https://' + urlInput;
    }

    let url;
    try {
        url = new URL(urlInput);
    } catch (e) {
        showToast('Error: Invalid URL', 'error');
        return;
    }

    document.getElementById('downloadBtn').disabled = true;
    document.getElementById('downloadBtn').classList.add('btn-disabled');

    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            htmlFiles.push({
                name: "index.html",
                content: html
            });

            fetchAllCSS(doc, url);
            fetchAllJS(doc, url);
            fetchAllAssets(doc, url);

            document.getElementById('downloadBtn').disabled = false;
            document.getElementById('downloadBtn').classList.remove('btn-disabled');
        })
        .catch(_error => {
            showToast('Error : Failed to fetch the URL', 'error');
            document.getElementById('downloadBtn').disabled = true;
            document.getElementById('downloadBtn').classList.add('btn-disabled');
        });
};


const fetchAllCSS = (doc, url) => {
    const cssPromises = [];
    Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
        .forEach(link => {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('https')) {
                const cssUrl = new URL(href, url);
                cssPromises.push(fetch(cssUrl.href).then(response => response.text())
                    .then(cssContent => {
                        const cssName = href.split('/').pop();
                        cssFiles.push({
                            name: cssName,
                            content: cssContent
                        });
                    }));
            }
        });

    Promise.all(cssPromises).catch(() => console.log("Error fetching CSS files"));
};

const fetchAllJS = (doc, url) => {
    const jsPromises = [];
    Array.from(doc.querySelectorAll('script[src]'))
        .forEach(script => {
            const src = script.getAttribute('src');
            if (src && !src.startsWith('http') && !src.startsWith('https')) {
                const jsUrl = new URL(src, url);
                jsPromises.push(fetch(jsUrl.href).then(response => response.text())
                    .then(jsContent => {
                        const jsName = src.split('/').pop();
                        jsFiles.push({
                            name: jsName,
                            content: jsContent
                        });
                    }));
            }
        });

    Promise.all(jsPromises).catch(() => console.log("Error fetching JS files"));
};

const fetchAllAssets = (doc, url) => {
    const assetTypes = ['img', 'svg', 'audio', 'video', 'source', 'link[rel="icon"]'];
    const assetPromises = [];

    assetTypes.forEach(type => {
        const elements = Array.from(doc.querySelectorAll(type));
        elements.forEach(element => {
            let assetUrl = '';
            if (type === 'img' || type === 'source') {
                assetUrl = element.getAttribute('src');
            } else if (type === 'link' && element.getAttribute('rel') === 'icon') {
                assetUrl = element.getAttribute('href');
            } else if (type === 'svg') {
                assetUrl = element.getAttribute('href');
            }
            if (assetUrl) {
                const asset = new URL(assetUrl, url).href;
                assetPromises.push(fetchAsset(asset));
            }
        });
    });

    Promise.all(assetPromises).then(() => {
        document.getElementById('downloadBtn').classList.remove('btn-disabled');
        document.getElementById('downloadBtn').disabled = false;
    }).catch(() => console.log("Error fetching assets"));
};

const fetchAsset = (assetUrl) => {
    return fetch(assetUrl)
        .then(response => {
            if (response.ok) {
                return response.blob();
            }
            return null;
        })
        .then(blob => {
            if (blob) {
                const assetName = assetUrl.split('/').pop();
                assetFiles.push({
                    name: assetName,
                    blob
                });
            }
        })
        .catch(() => {
            console.log(`Error fetching asset: ${assetUrl}`);
        });
};

const downloadZIP = () => {
    const zip = new JSZip();
    htmlFiles.forEach(file => zip.file(file.name, file.content));
    cssFiles.forEach(file => zip.file(file.name, file.content));
    jsFiles.forEach(file => zip.file(file.name, file.content));
    assetFiles.forEach(asset => zip.file(asset.name, asset.blob));

    zip.generateAsync({ type: "blob" })
        .then(content => {
            saveAs(content, "web_code.zip");
            showToast('Download successful ! ZIP file created.', 'success');
        })
        .catch(() => {
            showToast('Error : Failed to create ZIP file', 'error');
        });
};

const showToast = (message, type) => {
    const toast = document.createElement('div');
    toast.classList.add(
        'alert', 
        'alert-' + (type === 'success' ? 'success' : 'error'), 
        'w-full', 
        'mb-4', 
        'transition-opacity',  
        'duration-1000',  
        'opacity-100'    
    );
    toast.innerHTML = `
        <span>${message}</span>
    `;

    const toastContainer = document.getElementById('toast-container');
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('opacity-0');
    }, 3000); 

    setTimeout(() => {
        toast.remove();
    }, 4000); 
};
