import React, { useState, useRef, useEffect } from 'react';
import { useImageLibrary } from './ImageLibrary';
import './Watermark.css';

const Watermark = ({ transferToTab, pendingImageTransfer, availableTabs }) => {
  // Access image library
  const { imageLibrary, saveToLibrary } = useImageLibrary();

  
  // States for watermark settings
  const [watermarkType, setWatermarkType] = useState('text'); // 'text' or 'logo'
  const [text, setText] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  
  // States for images
  const [images, setImages] = useState([]); // Array of image objects
  const [processedImages, setProcessedImages] = useState([]);
  const [selectedImages, setSelectedImages] = useState(new Set());
  
  // Modal state for image preview
  const [modalImage, setModalImage] = useState(null);
  const [modalIndex, setModalIndex] = useState(0);
  
  // Watermark settings
  const [position, setPosition] = useState('bottom-right');
  const [fontSize, setFontSize] = useState(24);
  const [fontColor, setFontColor] = useState('#FFFFFF');
  const [opacity, setOpacity] = useState(0.8);
  const [logoSize, setLogoSize] = useState(100); // Logo size in pixels
  const [processing, setProcessing] = useState(false);
  
  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  
  const fileInputRef = useRef(null);
  const logoInputRef = useRef(null);
  const canvasRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Listen for image transfers from library
  useEffect(() => {
    const handleTransfer = (event) => {
      const { imageData } = event.detail;
      if (imageData) {
        handleImportFromLibrary(imageData);
      }
    };

    const handleDirectTransfer = (event) => {
      const { imageData } = event.detail;
      if (imageData) {
        handleImportFromLibrary(imageData);
      }
    };

    window.addEventListener('transferImage', handleTransfer);
    window.addEventListener('transferImageToWatermark', handleDirectTransfer);
    return () => {
      window.removeEventListener('transferImage', handleTransfer);
      window.removeEventListener('transferImageToWatermark', handleDirectTransfer);
    };
  }, []);

  // Listen to library changes - if library is empty, clear local images too
  useEffect(() => {
    if (imageLibrary.length === 0) {
      setImages([]);
      setProcessedImages([]);
      setSelectedImages(new Set());
    }
  }, [imageLibrary.length]);

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set to false if we're leaving the drop zone itself
    if (!dropZoneRef.current?.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const dataTransfer = e.dataTransfer;
    
    // Check if it's a library image being dragged
    try {
      const libraryImageData = dataTransfer.getData('application/json');
      if (libraryImageData) {
        const libraryImage = JSON.parse(libraryImageData);
        handleImportFromLibrary(libraryImage);
        return;
      }
    } catch (e) {
      // Not library data, check for files
    }

    // Handle files
    const files = Array.from(dataTransfer.files);
    if (files.length > 0) {
      // Create a file input event
      const fakeEvent = {
        target: {
          files: files
        }
      };
      handleImageUpload(fakeEvent);
    }
  };

  // Handle multiple image upload
  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    if (files.length > 10) {
      alert('ניתן להעלות עד 10 תמונות בבת אחת');
      return;
    }

    const newImages = [];
    let loadedCount = 0;

    files.forEach((file, index) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          newImages.push({
            id: Date.now() + index,
            file: file,
            name: file.name,
            url: e.target.result,
            processed: false
          });
          loadedCount++;
          
          if (loadedCount === files.filter(f => f.type.startsWith('image/')).length) {
            setImages(prev => [...prev, ...newImages]);
            setProcessedImages([]);
            
            // שמירה אוטומטית לספרייה
            newImages.forEach(img => {
              addImage(img.url, {
                name: img.name,
                tool: 'watermark-upload',
                timestamp: new Date(),
                isOriginal: true
              });
            });
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  // Handle logo upload
  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Apply watermark to single image
  const applyWatermarkToImage = async (imageObj) => {
    return new Promise((resolve) => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        if (watermarkType === 'text' && text.trim()) {
          // Apply text watermark
          ctx.save();
          ctx.globalAlpha = opacity;
          ctx.font = `${fontSize}px Arial`;
          ctx.fillStyle = fontColor;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          
          const textMetrics = ctx.measureText(text);
          const textWidth = textMetrics.width;
          const textHeight = fontSize;
          
          let x, y;
          const margin = 20;
          
          switch (position) {
            case 'top-left':
              x = margin;
              y = margin + textHeight;
              break;
            case 'top-right':
              x = img.width - textWidth - margin;
              y = margin + textHeight;
              break;
            case 'bottom-left':
              x = margin;
              y = img.height - margin;
              break;
            case 'bottom-right':
              x = img.width - textWidth - margin;
              y = img.height - margin;
              break;
            case 'center':
              x = (img.width - textWidth) / 2;
              y = img.height / 2;
              break;
            default:
              x = img.width - textWidth - margin;
              y = img.height - margin;
          }
          
          ctx.strokeText(text, x, y);
          ctx.fillText(text, x, y);
          ctx.restore();
          
        } else if (watermarkType === 'logo' && logoPreview) {
          // Apply logo watermark
          const logoImg = new Image();
          logoImg.onload = () => {
            ctx.save();
            ctx.globalAlpha = opacity;
            
            // Calculate logo dimensions maintaining aspect ratio
            const aspectRatio = logoImg.width / logoImg.height;
            let logoWidth = logoSize;
            let logoHeight = logoSize / aspectRatio;
            
            if (logoHeight > logoSize) {
              logoHeight = logoSize;
              logoWidth = logoSize * aspectRatio;
            }
            
            let x, y;
            const margin = 20;
            
            switch (position) {
              case 'top-left':
                x = margin;
                y = margin;
                break;
              case 'top-right':
                x = img.width - logoWidth - margin;
                y = margin;
                break;
              case 'bottom-left':
                x = margin;
                y = img.height - logoHeight - margin;
                break;
              case 'bottom-right':
                x = img.width - logoWidth - margin;
                y = img.height - logoHeight - margin;
                break;
              case 'center':
                x = (img.width - logoWidth) / 2;
                y = (img.height - logoHeight) / 2;
                break;
              default:
                x = img.width - logoWidth - margin;
                y = img.height - logoHeight - margin;
            }
            
            ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);
            ctx.restore();
            
            const dataURL = canvas.toDataURL('image/png');
            resolve({
              ...imageObj,
              processedUrl: dataURL,
              processed: true
            });
          };
          logoImg.src = logoPreview;
          
        } else {
          const dataURL = canvas.toDataURL('image/png');
          resolve({
            ...imageObj,
            processedUrl: dataURL,
            processed: true
          });
        }
        
        if (watermarkType === 'text') {
          const dataURL = canvas.toDataURL('image/png');
          resolve({
            ...imageObj,
            processedUrl: dataURL,
            processed: true
          });
        }
      };
      img.src = imageObj.url;
    });
  };

  // Apply watermark to all images
  const applyWatermarkToAll = async () => {
    if (images.length === 0) {
      alert('אנא העלה תמונות');
      return;
    }
    
    if (watermarkType === 'text' && !text.trim()) {
      alert('אנא הכנס טקסט לסימן מים');
      return;
    }
    
    if (watermarkType === 'logo' && !logoPreview) {
      alert('אנא העלה לוגו');
      return;
    }

    setProcessing(true);
    
    try {
      const processed = [];
      for (let i = 0; i < images.length; i++) {
        const result = await applyWatermarkToImage(images[i]);
        processed.push(result);
      }
      setProcessedImages(processed);
    } catch (error) {
      console.error('Error processing images:', error);
      alert('שגיאה בעיבוד התמונות');
    } finally {
      setProcessing(false);
    }
  };

  // Download selected images
  const downloadSelected = () => {
    if (selectedImages.size === 0) {
      alert('אנא בחר תמונות להורדה');
      return;
    }
    
    processedImages
      .filter(img => selectedImages.has(img.id))
      .forEach((img, index) => {
        setTimeout(() => {
          const link = document.createElement('a');
          link.href = img.processedUrl;
          link.download = `watermarked-${img.name}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }, index * 100); // Small delay between downloads
      });
  };

  // Download all images
  const downloadAll = () => {
    if (processedImages.length === 0) {
      alert('אין תמונות מעובדות להורדה');
      return;
    }
    
    processedImages.forEach((img, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = img.processedUrl;
        link.download = `watermarked-${img.name}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 100);
    });
  };

  // Toggle image selection
  const toggleImageSelection = (id) => {
    const newSelected = new Set(selectedImages);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedImages(newSelected);
  };

  // Select all images
  const selectAll = () => {
    const allIds = processedImages.map(img => img.id);
    setSelectedImages(new Set(allIds));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedImages(new Set());
  };

  // Modal functions
  const openModal = (image, index) => {
    setModalImage(image);
    setModalIndex(index);
  };

  const closeModal = () => {
    setModalImage(null);
  };

  const nextImage = () => {
    const nextIndex = (modalIndex + 1) % processedImages.length;
    setModalIndex(nextIndex);
    setModalImage(processedImages[nextIndex]);
  };

  const prevImage = () => {
    const prevIndex = modalIndex === 0 ? processedImages.length - 1 : modalIndex - 1;
    setModalIndex(prevIndex);
    setModalImage(processedImages[prevIndex]);
  };

  // Download single image from modal
  const downloadSingleImage = (image) => {
    const link = document.createElement('a');
    link.href = image.processedUrl;
    link.download = `watermarked-${image.name}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Library functions
  const handleImportFromLibrary = (libraryImage) => {
    const imageUrl = libraryImage.processedUrl || libraryImage.url || libraryImage.data;
    const newImage = {
      id: Date.now() + Math.random(),
      file: null,
      name: libraryImage.name || 'transferred-image',
      url: imageUrl,
      processed: false
    };
    setImages(prev => [...prev, newImage]);
    setProcessedImages([]);
  };

  const handleExportToLibrary = (imagesToExport) => {
    const exportData = imagesToExport.map(img => ({
      ...img,
      source: 'watermark',
      processedAt: new Date()
    }));

  };

  // Handle pending transfers from other tabs
  useEffect(() => {
    if (pendingImageTransfer && pendingImageTransfer.imageData) {
      const transferredImages = Array.isArray(pendingImageTransfer.imageData) 
        ? pendingImageTransfer.imageData 
        : [pendingImageTransfer.imageData];
      
      const newImages = transferredImages.map((img, index) => ({
        id: Date.now() + index,
        file: null,
        name: img.name || `transferred-${index + 1}.png`,
        url: img.url || img.processedUrl,
        processed: false
      }));
      
      setImages(prev => [...prev, ...newImages]);
      setProcessedImages([]);
    }
  }, [pendingImageTransfer]);

  // Reset function
  const resetTool = () => {
    setText('');
    setLogoFile(null);
    setLogoPreview('');
    setImages([]);
    setProcessedImages([]);
    setSelectedImages(new Set());
    setProcessing(false);
    setWatermarkType('text');
    setModalImage(null);
    setModalIndex(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const positionOptions = [
    { value: 'top-left', label: 'שמאל עליון' },
    { value: 'top-right', label: 'ימין עליון' },
    { value: 'bottom-left', label: 'שמאל תחתון' },
    { value: 'bottom-right', label: 'ימין תחתון' },
    { value: 'center', label: 'מרכז' }
  ];

  // Keyboard navigation for modal
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!modalImage) return;
      
      switch (e.key) {
        case 'Escape':
          closeModal();
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          if (processedImages.length > 1) nextImage();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          if (processedImages.length > 1) prevImage();
          break;
        default:
          break;
      }
    };

    if (modalImage) {
      document.addEventListener('keydown', handleKeyPress);
      return () => document.removeEventListener('keydown', handleKeyPress);
    }
  }, [modalImage, modalIndex, processedImages.length]);

  return (
    <div style={{ 
      padding: '20px', 
      background: 'white', 
      borderRadius: '12px', 
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      textAlign: 'center',
      maxWidth: '900px',
      margin: '0 auto'
    }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>🏷️ סימן מים מתקדם</h2>
        <button 
          onClick={resetTool}
          style={{
            padding: '8px 16px',
            background: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          🔄 איפוס
        </button>
      </div>
      
      <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>הוספת טקסט או לוגו לתמונות מרובות</p>
      
      {/* Quick actions with library */}
      {(images.length > 0 || processedImages.length > 0) && (
        <div style={{ 
          background: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '8px', 
          marginBottom: '20px',
          border: '1px solid #dee2e6'
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>📚 פעולות ספרייה:</h4>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                const imagesToSave = processedImages.length > 0 ? processedImages : images;
                handleExportToLibrary(imagesToSave);
                alert(`${imagesToSave.length} תמונות נשמרו בספרייה!`);
              }}
              style={{
                padding: '8px 12px',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              💾 שמור בספרייה ({processedImages.length > 0 ? processedImages.length : images.length})
            </button>
            {availableTabs && availableTabs.length > 0 && processedImages.length > 0 && (
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    transferToTab(e.target.value, processedImages);
                    e.target.value = '';
                  }
                }}
                style={{
                  padding: '8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                <option value="">🔄 העבר לכלי אחר...</option>
                {availableTabs.map(tab => (
                  <option key={tab.id} value={tab.id}>
                    {tab.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}
      
      {/* Upload Section with Drag & Drop */}
      <div style={{ marginBottom: '25px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #e3f2fd, #f3e5f5)',
          border: '2px solid #3498db',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '15px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '1.5em', marginBottom: '10px' }}>📚➡️🖼️</div>
          <h4 style={{ margin: '0 0 10px 0', color: '#1976d2' }}>
            💡 גרור תמונות מהספרייה או העלה ישירות!
          </h4>
          <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#555' }}>
            גרור תמונות מהספרייה הימנית לתיבה למטה או העלה תמונות חדשות
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: '#777', fontStyle: 'italic' }}>
            ✨ תמיכה מלאה ב-Drag & Drop + סנכרון אוטומטי
          </p>
        </div>
        
        <div 
          ref={dropZoneRef}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: `3px dashed ${isDragOver ? '#4CAF50' : '#bdc3c7'}`,
            borderRadius: '12px',
            padding: '30px',
            cursor: 'pointer',
            marginBottom: '15px',
            backgroundColor: isDragOver ? '#e8f5e8' : (images.length > 0 ? '#e8f5e8' : '#f8f9fa'),
            position: 'relative',
            transition: 'all 0.3s ease',
            transform: isDragOver ? 'scale(1.02)' : 'scale(1)'
          }}
        >
          {images.length === 0 && !isDragOver && (
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              background: '#ff9800',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: 'bold'
            }}>
              עבודה מקומית
            </div>
          )}
          
          <div style={{ fontSize: '2em', marginBottom: '10px' }}>
            {isDragOver ? '🎯' : '🖼️'}
          </div>
          
          <p style={{ 
            fontSize: '16px', 
            fontWeight: isDragOver ? 'bold' : 'normal',
            color: isDragOver ? '#4CAF50' : 'inherit'
          }}>
            {isDragOver 
              ? '🎯 שחרר כאן!' 
              : images.length > 0 
                ? `✅ ${images.length} תמונות נבחרו` 
                : '🤏 גרור תמונות מהספרייה או לחץ לבחירה (עד 10)'
            }
          </p>
          
          {isDragOver && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(76, 175, 80, 0.1)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '48px'
            }}>
              ⬇️
            </div>
          )}
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
      </div>

      {/* Watermark Type Selection */}
      <div style={{ marginBottom: '20px' }}>
        <h3>🎨 סוג סימן מים:</h3>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '15px' }}>
          <button
            onClick={() => setWatermarkType('text')}
            style={{
              padding: '10px 20px',
              background: watermarkType === 'text' ? '#3498db' : '#ecf0f1',
              color: watermarkType === 'text' ? 'white' : '#2c3e50',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            📝 טקסט
          </button>
          <button
            onClick={() => setWatermarkType('logo')}
            style={{
              padding: '10px 20px',
              background: watermarkType === 'logo' ? '#3498db' : '#ecf0f1',
              color: watermarkType === 'logo' ? 'white' : '#2c3e50',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            🖼️ לוגו
          </button>
        </div>
        
        {watermarkType === 'logo' && (
          <div style={{ marginBottom: '15px' }}>
            <div 
              onClick={() => logoInputRef.current?.click()}
              style={{
                border: '2px dashed #bdc3c7',
                borderRadius: '8px',
                padding: '20px',
                cursor: 'pointer',
                backgroundColor: logoPreview ? '#e8f5e8' : '#f8f9fa',
                marginBottom: '10px'
              }}
            >
              {logoPreview ? (
                <div>
                  <img 
                    src={logoPreview} 
                    alt="Logo preview" 
                    style={{ maxWidth: '100px', maxHeight: '100px', marginBottom: '10px' }}
                  />
                  <p>✅ לוגו נטען</p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '1.5em', marginBottom: '5px' }}>🖼️</div>
                  <p>לחץ לבחירת לוגו</p>
                </div>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              style={{ display: 'none' }}
            />
          </div>
        )}
      </div>

      {/* Settings */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        textAlign: 'left'
      }}>
        <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>הגדרות סימן מים</h3>
        
        {watermarkType === 'text' && (
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>טקסט:</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="הכנס טקסט לסימן מים..."
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #dee2e6',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: watermarkType === 'text' ? '1fr 1fr' : '1fr 1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              מיקום:
            </label>
            <select 
              value={position} 
              onChange={(e) => setPosition(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #dee2e6',
                borderRadius: '4px'
              }}
            >
              {positionOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
              שקיפות: {Math.round(opacity * 100)}%
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {watermarkType === 'text' ? (
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    גודל גופן: {fontSize}px
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="72"
                    value={fontSize}
                    onChange={(e) => setFontSize(parseInt(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                    צבע טקסט:
                  </label>
                  <input
                    type="color"
                    value={fontColor}
                    onChange={(e) => setFontColor(e.target.value)}
                    style={{
                      width: '100%',
                      height: '36px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                גודל לוגו: {logoSize}px
              </label>
              <input
                type="range"
                min="50"
                max="300"
                value={logoSize}
                onChange={(e) => setLogoSize(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}
        </div>
      </div>
      
      <button 
        style={{
          padding: '12px 24px',
          background: processing ? '#95a5a6' : '#27ae60',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: processing ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          marginBottom: '20px'
        }}
        onClick={applyWatermarkToAll}
        disabled={processing || images.length === 0}
      >
        {processing ? '⏳ מעבד...' : `✨ הוסף סימן מים לכל התמונות (${images.length})`}
      </button>

      {/* Images Grid */}
      {images.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h3>📸 תמונות שנטענו:</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '10px',
            marginTop: '15px'
          }}>
            {images.map((img) => (
              <div key={img.id} style={{
                border: '2px solid #dee2e6',
                borderRadius: '8px',
                padding: '10px',
                textAlign: 'center'
              }}>
                <img 
                  src={img.url} 
                  alt={img.name}
                  style={{
                    width: '100%',
                    height: '100px',
                    objectFit: 'cover',
                    borderRadius: '4px',
                    marginBottom: '5px'
                  }}
                />
                <p style={{ fontSize: '12px', margin: 0, wordBreak: 'break-word' }}>
                  {img.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processed Images */}
      {processedImages.length > 0 && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3 style={{ margin: 0 }}>✅ תמונות מעובדות ({processedImages.length}):</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={selectAll} style={{
                padding: '5px 10px', background: '#3498db', color: 'white',
                border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
              }}>
                בחר הכל
              </button>
              <button onClick={clearSelection} style={{
                padding: '5px 10px', background: '#95a5a6', color: 'white',
                border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'
              }}>
                בטל בחירה
              </button>
            </div>
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '15px',
            marginBottom: '20px'
          }}>
                         {processedImages.map((img, index) => (
               <div key={img.id} style={{
                 border: selectedImages.has(img.id) ? '3px solid #3498db' : '2px solid #dee2e6',
                 borderRadius: '8px',
                 padding: '10px',
                 textAlign: 'center',
                 backgroundColor: selectedImages.has(img.id) ? '#e3f2fd' : 'white',
                 position: 'relative'
               }}>
                 <div 
                   style={{
                     position: 'relative',
                     cursor: 'pointer'
                   }}
                   onClick={() => toggleImageSelection(img.id)}
                 >
                   <img 
                     src={img.processedUrl} 
                     alt={`Processed ${img.name}`}
                     style={{
                       width: '100%',
                       height: '120px',
                       objectFit: 'cover',
                       borderRadius: '4px',
                       marginBottom: '8px'
                     }}
                   />
                   
                   {/* Preview overlay */}
                   <div 
                     onClick={(e) => {
                       e.stopPropagation();
                       openModal(img, index);
                     }}
                     style={{
                       position: 'absolute',
                       top: '5px',
                       right: '5px',
                       background: 'rgba(0,0,0,0.7)',
                       color: 'white',
                       borderRadius: '50%',
                       width: '30px',
                       height: '30px',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       cursor: 'pointer',
                       fontSize: '14px',
                       transition: 'all 0.2s'
                     }}
                     onMouseEnter={(e) => {
                       e.target.style.background = 'rgba(52, 152, 219, 0.9)';
                       e.target.style.transform = 'scale(1.1)';
                     }}
                     onMouseLeave={(e) => {
                       e.target.style.background = 'rgba(0,0,0,0.7)';
                       e.target.style.transform = 'scale(1)';
                     }}
                     title="הצג בגודל מלא"
                   >
                     🔍
                   </div>
                 </div>
                 
                 <p style={{ fontSize: '12px', margin: 0, wordBreak: 'break-word' }}>
                   {img.name}
                 </p>
                 {selectedImages.has(img.id) && (
                   <div style={{ color: '#3498db', fontSize: '14px', marginTop: '5px' }}>
                     ✓ נבחר
                   </div>
                 )}
               </div>
             ))}
          </div>
          
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button 
              onClick={downloadSelected}
              disabled={selectedImages.size === 0}
              style={{
                padding: '10px 20px',
                background: selectedImages.size > 0 ? '#e74c3c' : '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: selectedImages.size > 0 ? 'pointer' : 'not-allowed',
                fontSize: '14px'
              }}
            >
              💾 הורד נבחרות ({selectedImages.size})
            </button>
            <button 
              onClick={downloadAll}
              style={{
                padding: '10px 20px',
                background: '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              💾 הורד הכל ({processedImages.length})
            </button>
          </div>
          
          {/* Quick Transfer Buttons */}
          {processedImages.length > 0 && availableTabs && availableTabs.length > 0 && (
            <div style={{
              background: '#e8f4fd',
              padding: '15px',
              borderRadius: '8px',
              marginTop: '15px'
            }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
                🚀 המשך עיבוד - העבר ל:
              </h4>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {availableTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => transferToTab(tab.id, processedImages)}
                    style={{
                      padding: '8px 12px',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px'
                    }}
                  >
                    {tab.name} →
                  </button>
                ))}
              </div>
              <p style={{ 
                fontSize: '11px', 
                color: '#6c757d', 
                margin: '8px 0 0 0',
                fontStyle: 'italic'
              }}>
                התמונות המעובדות יועברו ישירות ללשונית שתבחר
              </p>
            </div>
          )}
        </div>
      )}

      {/* Image Modal */}
      {modalImage && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={closeModal}
        >
          <div 
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Image */}
            <img 
              src={modalImage.processedUrl}
              alt={modalImage.name}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
              }}
            />
            
            {/* Image info and controls */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.95)',
              padding: '15px 20px',
              borderRadius: '8px',
              marginTop: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '15px',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              <div style={{ textAlign: 'center', minWidth: '200px' }}>
                <h4 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{modalImage.name}</h4>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                  תמונה {modalIndex + 1} מתוך {processedImages.length}
                </p>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {/* Navigation buttons */}
                {processedImages.length > 1 && (
                  <>
                    <button 
                      onClick={prevImage}
                      style={{
                        padding: '8px 12px',
                        background: '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                      title="תמונה קודמת"
                    >
                      ◀ קודם
                    </button>
                    <button 
                      onClick={nextImage}
                      style={{
                        padding: '8px 12px',
                        background: '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                      title="תמונה הבאה"
                    >
                      הבא ▶
                    </button>
                  </>
                )}
                
                {/* Download button */}
                <button 
                  onClick={() => downloadSingleImage(modalImage)}
                  style={{
                    padding: '8px 12px',
                    background: '#27ae60',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  💾 הורד
                </button>
                
                {/* Select/Deselect button */}
                <button 
                  onClick={() => toggleImageSelection(modalImage.id)}
                  style={{
                    padding: '8px 12px',
                    background: selectedImages.has(modalImage.id) ? '#e74c3c' : '#f39c12',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {selectedImages.has(modalImage.id) ? '❌ בטל בחירה' : '✅ בחר'}
                </button>
                
                {/* Close button */}
                <button 
                  onClick={closeModal}
                  style={{
                    padding: '8px 12px',
                    background: '#95a5a6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  ✕ סגור
                </button>
              </div>
            </div>
            
            {/* Keyboard navigation hint */}
            {processedImages.length > 1 && (
              <p style={{
                color: 'white',
                fontSize: '12px',
                marginTop: '10px',
                textAlign: 'center',
                opacity: 0.7
              }}>
                השתמש בחצים או לחץ על הכפתורים לניווט
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Watermark; 
