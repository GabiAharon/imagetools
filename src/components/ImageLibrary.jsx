import React, { useState, useRef, useContext, createContext } from 'react';
import './ImageLibrary.css';

// Context לשיתוף ספריית התמונות בין כל הקומפוננטים
export const ImageLibraryContext = createContext();

// Hook לשימוש בספריית התמונות
export const useImageLibrary = () => {
  const context = useContext(ImageLibraryContext);
  if (!context) {
    throw new Error('useImageLibrary must be used within ImageLibraryProvider');
  }
  return context;
};

// Provider לניהול ספריית התמונות
export const ImageLibraryProvider = ({ children }) => {
  const [images, setImages] = useState([]);

  const addImage = (imageData, metadata = {}) => {
    const newImage = {
      id: Date.now() + Math.random(),
      data: imageData,
      timestamp: new Date(),
      name: metadata.name || `תמונה ${images.length + 1}`,
      ...metadata
    };
    setImages(prev => [...prev, newImage]);
    return newImage.id;
  };

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const clearAll = () => {
    setImages([]);
  };

  const updateImage = (id, newData, newMetadata = {}) => {
    setImages(prev => prev.map(img => 
      img.id === id 
        ? { ...img, data: newData, timestamp: new Date(), ...newMetadata }
        : img
    ));
  };

  const saveToLibrary = (imageData) => {
    const newImage = {
      id: imageData.id || Date.now() + Math.random(),
      name: imageData.name || `תמונה ${images.length + 1}`,
      url: imageData.url,
      processedUrl: imageData.processedUrl || imageData.url,
      source: imageData.source || 'unknown',
      processed: imageData.processed || false,
      metadata: imageData.metadata || {},
      timestamp: new Date(),
      ...imageData
    };
    setImages(prev => [...prev, newImage]);
    return newImage.id;
  };

  return (
    <ImageLibraryContext.Provider value={{
      images,
      imageLibrary: images,
      addImage,
      saveToLibrary,
      removeImage,
      clearAll,
      updateImage
    }}>
      {children}
    </ImageLibraryContext.Provider>
  );
};

// קומפוננט ספריית התמונות הראשי
const ImageLibrary = ({ language, onTransferToTab }) => {
  const { images, addImage, removeImage, clearAll } = useImageLibrary();
  const fileInputRef = useRef(null);

  const text = {
    he: {
      title: 'ספריית תמונות',
      addImages: 'הוסף תמונות',
      clearAll: 'נקה הכל',
      transferTo: 'העבר לכלי:',
      transferAll: 'העבר הכל',
      transfer: 'העבר',
      delete: 'מחק',
      noImages: 'אין תמונות בספרייה',
      dragDrop: 'גרור תמונות לכאן או לחץ להוספה',
      count: 'תמונות'
    },
    en: {
      title: 'Image Library',
      addImages: 'Add Images',
      clearAll: 'Clear All',
      transferTo: 'Transfer to:',
      transferAll: 'Transfer All',
      transfer: 'Transfer',
      delete: 'Delete',
      noImages: 'No images in library',
      dragDrop: 'Drag images here or click to add',
      count: 'images'
    }
  };

  const t = text[language] || text.he;

  const tools = [
    { id: 'background', name: { he: 'הסרת רקע', en: 'Background Removal' } },
    { id: 'crop', name: { he: 'חיתוך', en: 'Crop' } },
    { id: 'resize', name: { he: 'שינוי גודל', en: 'Resize' } },
    { id: 'format', name: { he: 'המרת פורמט', en: 'Format' } },
    { id: 'ocr', name: { he: 'זיהוי טקסט', en: 'OCR' } },
    { id: 'watermark', name: { he: 'סימן מים', en: 'Watermark' } },
    { id: 'qr', name: { he: 'ברקוד', en: 'QR Code' } }
  ];

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          addImage(e.target.result, {
            name: file.name,
            type: file.type,
            size: file.size
          });
        };
        reader.readAsDataURL(file);
      }
    });
    event.target.value = ''; // Reset input
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          addImage(e.target.result, {
            name: file.name,
            type: file.type,
            size: file.size
          });
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const transferImage = (imageId, toolId) => {
    const image = images.find(img => img.id === imageId);
    if (image) {
      // First change the tab
      if (onTransferToTab) {
        onTransferToTab(toolId, image);
      }
      
      // Then send the event after a small delay to ensure the component is mounted
      setTimeout(() => {
        const eventMap = {
          'background': 'transferImageToBackgroundRemover',
          'crop': 'transferImageToCropper',
          'resize': 'transferImageToResizer',
          'format': 'transferImageToFormatConverter',
          'ocr': 'transferImageToTextExtractor',
          'watermark': 'transferImageToWatermark',
          'qr': 'transferImageToQRCode'
        };
        
        const eventName = eventMap[toolId];
        if (eventName) {
          window.dispatchEvent(new CustomEvent(eventName, {
            detail: { imageData: image }
          }));
        }
      }, 100);
    }
  };

  const transferAllImages = (toolId) => {
    if (images.length > 0) {
      images.forEach(image => {
        transferImage(image.id, toolId);
      });
    }
  };

  return (
    <div className={`image-library ${language}`}>
      <div className="library-header">
        <h3 className="library-title">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h12a2 2 0 012 2zm-2 0H6v12h12V6zm-5 7l-3-3-3 3h6z"/>
          </svg>
          {t.title}
        </h3>
        <div className="library-count">
          {images.length} {t.count}
        </div>
      </div>

      <div className="library-actions">
        <button 
          className="library-btn primary"
          onClick={() => fileInputRef.current?.click()}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 7v3h-2V7h-3V5h3V2h2v3h3v2h-3zm-3 4V9h-3V7H5c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2h9c1.1 0 2-.9 2-2v-2h2c1.1 0 2-.9 2-2V9h-2z"/>
          </svg>
          {t.addImages}
        </button>
        
        {images.length > 0 && (
          <button 
            className="library-btn danger"
            onClick={clearAll}
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
            </svg>
            {t.clearAll}
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />

      {images.length === 0 ? (
        <div 
          className="library-empty"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
          </svg>
          <p>{t.dragDrop}</p>
        </div>
      ) : (
        <div className="library-content">
          <div className="library-grid">
            {images.map(image => (
              <div key={image.id} className="library-item"
                   draggable="true"
                   onDragStart={(e) => {
                     e.dataTransfer.setData('application/json', JSON.stringify(image));
                     e.dataTransfer.effectAllowed = 'copy';
                   }}
                   style={{ cursor: 'grab' }}
                   title={`${t.transferTo} - ${language === 'he' ? 'גרור לכלי הרצוי' : 'Drag to desired tool'}`}>
                <div className="library-image">
                  <img src={image.processedUrl || image.url || image.data} alt={image.name} />
                  <div className="library-overlay">
                    <button
                      className="overlay-btn delete"
                      onClick={() => removeImage(image.id)}
                      title={t.delete}
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </div>
                </div>
                
                <div className="library-info">
                  <div className="library-name">{image.name}</div>
                  <div className="library-date">
                    {image.timestamp.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}
                  </div>
                </div>

                <div className="library-transfer">
                  <select 
                    className="transfer-select"
                    onChange={(e) => {
                      if (e.target.value) {
                        transferImage(image.id, e.target.value);
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="">{t.transferTo}</option>
                    {tools.map(tool => (
                      <option key={tool.id} value={tool.id}>
                        {tool.name[language]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>

          {images.length > 1 && (
            <div className="library-transfer-all">
              <label>{t.transferAll}:</label>
              <select 
                className="transfer-select"
                onChange={(e) => {
                  if (e.target.value) {
                    transferAllImages(e.target.value);
                    e.target.value = '';
                  }
                }}
              >
                <option value="">{t.transferTo}</option>
                {tools.map(tool => (
                  <option key={tool.id} value={tool.id}>
                    {tool.name[language]}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageLibrary; 