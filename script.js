// script.js

const imageUpload = document.getElementById('imageUpload');
const dropArea = document.getElementById('dropArea');
const uploadedImage = document.getElementById('uploadedImage');
const downloadButton = document.getElementById('downloadButton');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const previewContainer = document.getElementById('previewContainer');
const imageContainer = document.getElementById('imageContainer');
const customOverlay = document.getElementById('customOverlay');
const overlayOptions = document.querySelectorAll('input[name="overlayType"]');

// CHAVES: URLs das imagens de overlay
const OVERLAY_URLS = {
    'evento': '1N.png',
    'hallfama': '2N.png',
    'eventovip' : '3N.png'
};

// Objeto de imagem global para o overlay (usado para desenhar no Canvas)
const overlayImg = new Image();
overlayImg.crossOrigin = 'Anonymous'; // Boa prática, mesmo para local

let currentImageFile = null; // Armazena o arquivo carregado atualmente
let currentOverlayType = 'evento'; // Opção inicial

// Função para aplicar o overlay (usada no início e na mudança de opção)
function updateOverlay(type) {
    const url = OVERLAY_URLS[type];
    
    // 1. Atualiza a URL do overlay para o Canvas
    if (url) {
        overlayImg.src = url;
    }

    // 2. Atualiza o CSS (visual) do overlay no Preview
    customOverlay.style.backgroundImage = url ? `url(${url})` : 'none';
}

// Inicializa o overlay com a opção padrão ('evento')
updateOverlay(currentOverlayType);

// --- Listener para a Mudança de Opção de Overlay ---
overlayOptions.forEach(radio => {
    radio.addEventListener('change', (e) => {
        currentOverlayType = e.target.value;
        updateOverlay(currentOverlayType);

        // Se uma imagem base já foi carregada, reprocessa para garantir que o preview seja atualizado
        if (uploadedImage.src && currentImageFile) {
             // O "uploadedImage.src" só precisa ser refeito se o cache for um problema,
             // mas atualizar o background-image do CSS já resolve a visualização:
             // O CSS já foi atualizado pela função updateOverlay().
        }
    });
});


// Função que processa o arquivo (File object)
function processFile(file) {
    if (file && file.type.startsWith('image/')) {
        currentImageFile = file; // Salva o arquivo para uso futuro no download
        const reader = new FileReader();
        reader.onload = function(event) {
            uploadedImage.src = event.target.result;
            
            // 1. Alterna o display para o preview
            uploadPlaceholder.style.display = 'none';
            previewContainer.style.display = 'flex';
            
            // 2. Garante que a imagem seja totalmente carregada
            uploadedImage.onload = function() {
                // Configura as dimensões do container para o tamanho original da imagem
                imageContainer.style.width = uploadedImage.naturalWidth + 'px';
                imageContainer.style.height = uploadedImage.naturalHeight + 'px';
                
                // Limita a exibição na UI
                imageContainer.style.maxWidth = '50%'; 
                imageContainer.style.height = 'auto'; 
            }
        };
        reader.readAsDataURL(file);
    } else {
        alert('Por favor, carregue um arquivo de imagem válido.');
    }
}

// --- Lógica de Upload Padrão (Clique) e Drag/Drop/Paste (Mantidas) ---
imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    processFile(file);
});

// Drag and Drop: (Mantido o código de prevenção, highlight e drop)
;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false); 
});
function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }
;['dragenter', 'dragover'].forEach(eventName => { dropArea.addEventListener(eventName, highlight, false); });
;['dragleave', 'drop'].forEach(eventName => { dropArea.addEventListener(eventName, unhighlight, false); });
function highlight() { dropArea.classList.add('highlight'); }
function unhighlight() { dropArea.classList.remove('highlight'); }

dropArea.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
        processFile(files[0]);
    }
}, false);

document.addEventListener('paste', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') { return; }
    const items = e.clipboardData.items;
    let imageFile = null;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
            imageFile = items[i].getAsFile();
            break;
        }
    }
    if (imageFile) { processFile(imageFile); }
});


// --- Lógica de Download com Canvas (Combinação de Imagem + Overlay) ---

downloadButton.addEventListener('click', function() {
    if (!uploadedImage.src || !uploadedImage.naturalWidth) {
        alert('Por favor, carregue uma imagem primeiro.');
        return;
    }

    // O Canvas.toDataURL é a etapa crítica que não pode ser "tainted"
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const imgWidth = uploadedImage.naturalWidth;
    const imgHeight = uploadedImage.naturalHeight;

    canvas.width = imgWidth;
    canvas.height = imgHeight;

    // 1. Desenha a Imagem Carregada (Base)
    // Precisamos de um objeto Image limpo da origem da base64
    const baseImg = new Image();
    baseImg.onload = function() {
        ctx.drawImage(baseImg, 0, 0, imgWidth, imgHeight);
        
        // 2. Desenha o Overlay (por cima)
        if (overlayImg.complete && overlayImg.naturalWidth !== 0) {
            // Desenha a imagem de overlay, FORÇANDO que ela cubra TODO o canvas
            ctx.drawImage(overlayImg, 0, 0, imgWidth, imgHeight);
            
            // 3. Converte e Baixa
            const dataURL = canvas.toDataURL('image/png'); 
            const a = document.createElement('a');
            a.href = dataURL;
            a.download = `imagem-${currentOverlayType}-${new Date().getTime()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else {
            alert('A imagem de overlay ainda não carregou ou o caminho está incorreto.');
        }
    };
    // Garante que o objeto Image seja carregado para o Canvas
    baseImg.src = uploadedImage.src; 
});