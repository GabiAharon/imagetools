import React, { useState, useRef, useEffect } from 'react'
import { useImageLibrary } from './ImageLibrary'
import './ImageResizer.css'

const ImageResizer = ({ transferToTab, pendingImageTransfer, availableTabs }) => {
  const { addImage } = useImageLibrary();

  const [selectedImage, setSelectedImage] = useState(null)
  const [resizedImage, setResizedImage] = useState(null)
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 })
  const [newDimensions, setNewDimensions] = useState({ width: 0, height: 0 })
  const [aspectRatioLocked, setAspectRatioLocked] = useState(true)
  const [imageQuality, setImageQuality] = useState(0.9)
  const [imageFormat, setImageFormat] = useState('image/png')
  const [resizeMethod, setResizeMethod] = useState('bilinear')
  const [loading, setLoading] = useState(false)
  
  const canvasRef = useRef(null)
  const fileInputRef = useRef(null)

  // האזנה להעברת תמונות מספריית התמונות
  useEffect(() => {
    const handleTransferImage = (event) => {
      if (event.detail && event.detail.targetTab === 'resize') {
        const imageData = event.detail.imageData;
        const imageUrl = imageData.processedUrl || imageData.url || imageData.data;
        const img = new Image();
        img.onload = () => {
          setSelectedImage(imageUrl);
          setOriginalDimensions({ width: img.width, height: img.height });
          setNewDimensions({ width: img.width, height: img.height });
          setResizedImage(null);
        };
        img.src = imageUrl;
      }
    };

    const handleDirectTransfer = (event) => {
      if (event.detail && event.detail.imageData) {
        const imageData = event.detail.imageData;
        const imageUrl = imageData.processedUrl || imageData.url || imageData.data;
        const img = new Image();
        img.onload = () => {
          setSelectedImage(imageUrl);
          setOriginalDimensions({ width: img.width, height: img.height });
          setNewDimensions({ width: img.width, height: img.height });
          setResizedImage(null);
        };
        img.src = imageUrl;
      }
    };

    window.addEventListener('transferImage', handleTransferImage);
    window.addEventListener('transferImageToResizer', handleDirectTransfer);
    return () => {
      window.removeEventListener('transferImage', handleTransferImage);
      window.removeEventListener('transferImageToResizer', handleDirectTransfer);
    };
  }, []);

  // גדלים מוגדרים מראש
  const presetSizes = [
    { name: 'אייקון קטן', width: 16, height: 16 },
    { name: 'אייקון בינוני', width: 32, height: 32 },
    { name: 'אייקון גדול', width: 64, height: 64 },
    { name: 'תמונת פרופיל', width: 128, height: 128 },
    { name: 'תמונת כותרת', width: 1200, height: 630 },
    { name: 'HD', width: 1920, height: 1080 },
    { name: '4K', width: 3840, height: 2160 },
    { name: 'Instagram Post', width: 1080, height: 1080 },
    { name: 'Instagram Story', width: 1080, height: 1920 },
    { name: 'Facebook Cover', width: 820, height: 312 }
  ]

  // פונקציה לטעינת תמונה
  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          setSelectedImage(e.target.result)
          setOriginalDimensions({ width: img.width, height: img.height })
          setNewDimensions({ width: img.width, height: img.height })
          setResizedImage(null)
          
          // שמירה אוטומטית לספרייה
          addImage(e.target.result, {
            name: file.name,
            tool: 'image-resizer-upload',
            timestamp: new Date(),
            isOriginal: true
          });
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    }
  }

  // פונקציה לשמירת יחס גובה-רוחב
  const updateDimensions = (dimension, value) => {
    const aspectRatio = originalDimensions.width / originalDimensions.height
    
    if (aspectRatioLocked) {
      if (dimension === 'width') {
        setNewDimensions({
          width: parseInt(value) || 0,
          height: Math.round((parseInt(value) || 0) / aspectRatio)
        })
      } else {
        setNewDimensions({
          width: Math.round((parseInt(value) || 0) * aspectRatio),
          height: parseInt(value) || 0
        })
      }
    } else {
      setNewDimensions(prev => ({
        ...prev,
        [dimension]: parseInt(value) || 0
      }))
    }
  }

  // פונקציה לשינוי גודל תמונה עם אלגוריתמים מתקדמים
  const resizeImage = async () => {
    if (!selectedImage || !newDimensions.width || !newDimensions.height) return

    setLoading(true)
    
    try {
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        
        // הגדרת גודל Canvas
        canvas.width = newDimensions.width
        canvas.height = newDimensions.height
        
        // הגדרות איכות
        if (resizeMethod === 'bilinear') {
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
        } else if (resizeMethod === 'nearest') {
          ctx.imageSmoothingEnabled = false
        } else if (resizeMethod === 'bicubic') {
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
        }

        // שינוי גודל מתקדם - אם התמונה גדולה מדי, נעשה זאת בשלבים
        if (originalDimensions.width > newDimensions.width * 2 || 
            originalDimensions.height > newDimensions.height * 2) {
          // שינוי גודל הדרגתי לאיכות טובה יותר
          resizeInSteps(img, ctx, originalDimensions, newDimensions)
        } else {
          // שינוי גודל ישיר
          ctx.drawImage(img, 0, 0, newDimensions.width, newDimensions.height)
        }
        
        // יצירת תמונה מחדש
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob)
          setResizedImage(url)
          setLoading(false)
        }, imageFormat, imageQuality)
      }
      img.src = selectedImage
    } catch (error) {
      console.error('שגיאה בשינוי גודל התמונה:', error)
      setLoading(false)
    }
  }

  // פונקציה לשינוי גודל הדרגתי (למניעת איבוד איכות)
  const resizeInSteps = (img, finalCtx, originalSize, targetSize) => {
    let currentWidth = originalSize.width
    let currentHeight = originalSize.height
    
    // יצירת canvas זמני
    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')
    
    // העתקת התמונה המקורית ל-canvas זמני
    tempCanvas.width = currentWidth
    tempCanvas.height = currentHeight
    tempCtx.drawImage(img, 0, 0)
    
    // שינוי גודל הדרגתי (50% בכל פעם)
    while (currentWidth > targetSize.width * 2 || currentHeight > targetSize.height * 2) {
      currentWidth = Math.max(currentWidth * 0.5, targetSize.width)
      currentHeight = Math.max(currentHeight * 0.5, targetSize.height)
      
      const newCanvas = document.createElement('canvas')
      const newCtx = newCanvas.getContext('2d')
      newCanvas.width = currentWidth
      newCanvas.height = currentHeight
      
      newCtx.imageSmoothingEnabled = true
      newCtx.imageSmoothingQuality = 'high'
      newCtx.drawImage(tempCanvas, 0, 0, currentWidth, currentHeight)
      
      // העברה ל-canvas הזמני
      tempCanvas.width = currentWidth
      tempCanvas.height = currentHeight
      tempCtx.clearRect(0, 0, currentWidth, currentHeight)
      tempCtx.drawImage(newCanvas, 0, 0)
    }
    
    // שינוי גודל סופי
    finalCtx.drawImage(tempCanvas, 0, 0, targetSize.width, targetSize.height)
  }

  // פונקציה להורדת התמונה
  const downloadImage = () => {
    if (!resizedImage) return
    
    const link = document.createElement('a')
    link.href = resizedImage
    const extension = imageFormat === 'image/png' ? 'png' : 
                     imageFormat === 'image/jpeg' ? 'jpg' : 'webp'
    link.download = `resized_image_${newDimensions.width}x${newDimensions.height}.${extension}`
    link.click()
  }

  // פונקציה לשימוש בגודל מוגדר מראש
  const applyPresetSize = (preset) => {
    setNewDimensions({ width: preset.width, height: preset.height })
    setAspectRatioLocked(false)
  }

  // חישוב גודל קובץ משוער
  const getFileSizeEstimate = () => {
    if (!newDimensions.width || !newDimensions.height) return '0 KB'
    
    const pixels = newDimensions.width * newDimensions.height
    let bytesPerPixel = 4 // PNG
    
    if (imageFormat === 'image/jpeg') {
      bytesPerPixel = pixels < 100000 ? 1.5 : 1 // JPEG דחיסה
    } else if (imageFormat === 'image/webp') {
      bytesPerPixel = pixels < 100000 ? 1.2 : 0.8 // WebP דחיסה טובה יותר
    }
    
    const estimatedSize = pixels * bytesPerPixel * imageQuality
    
    if (estimatedSize > 1024 * 1024) {
      return `${(estimatedSize / (1024 * 1024)).toFixed(1)} MB`
    }
    return `${(estimatedSize / 1024).toFixed(0)} KB`
  }

  // Save to library
  const saveToLibrary = () => {
    if (!resizedImage) return;
    
    const extension = imageFormat === 'image/png' ? 'png' : imageFormat === 'image/jpeg' ? 'jpg' : 'webp';
    addImage(resizedImage, {
      name: `שינוי גודל ${newDimensions.width}×${newDimensions.height} - ${new Date().toLocaleDateString('he-IL')}`,
      tool: 'image-resizer',
      originalName: `resized-${newDimensions.width}x${newDimensions.height}.${extension}`,
      timestamp: new Date()
    });
  };

  // Handle pending transfers from other tabs or library
  useEffect(() => {
    if (pendingImageTransfer && pendingImageTransfer.imageData) {
      const firstImage = Array.isArray(pendingImageTransfer.imageData) 
        ? pendingImageTransfer.imageData[0] 
        : pendingImageTransfer.imageData;
      
      if (firstImage && (firstImage.url || firstImage.processedUrl)) {
        const img = new Image();
        img.onload = () => {
          setSelectedImage(firstImage.url || firstImage.processedUrl);
          setOriginalDimensions({ width: img.width, height: img.height });
          setNewDimensions({ width: img.width, height: img.height });
          setResizedImage(null);
        };
        img.src = firstImage.url || firstImage.processedUrl;
      }
    }
  }, [pendingImageTransfer]);

  return (
    <div className="image-resizer">
      <div className="resizer-header">
        <h2>🔧 שינוי גודל תמונות מתקדם</h2>
        <p>שנה את גודל התמונות שלך עם דיוק פיקסל ואיכות מקצועית</p>
      </div>

      {!selectedImage ? (
        <div className="upload-section">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
          <div 
            className="upload-zone"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="upload-content">
              <span className="upload-icon">📷</span>
              <h3>העלה תמונה לשינוי גודל</h3>
              <p>גרור קובץ לכאן או לחץ לבחירה</p>
              <p className="supported-formats">
                תומך ב: PNG, JPG, JPEG, WebP, GIF
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="resizer-workspace">
          <div className="image-preview-section">
            <div className="original-image">
              <h3>תמונה מקורית</h3>
              <img src={selectedImage} alt="מקורית" />
              <p>{originalDimensions.width} × {originalDimensions.height} פיקסלים</p>
            </div>
            
            {resizedImage && (
              <div className="resized-image">
                <h3>תמונה לאחר שינוי גודל</h3>
                <img src={resizedImage} alt="לאחר שינוי גודל" />
                <p>{newDimensions.width} × {newDimensions.height} פיקסלים</p>
                <p>גודל משוער: {getFileSizeEstimate()}</p>
              </div>
            )}
          </div>

          <div className="controls-section">
            <div className="dimensions-control">
              <h3>🎯 גדלים מותאמים אישית</h3>
              
              <div className="dimension-inputs">
                <div className="input-group">
                  <label>רוחב (פיקסלים)</label>
                  <input
                    type="number"
                    value={newDimensions.width}
                    onChange={(e) => updateDimensions('width', e.target.value)}
                    min="1"
                    max="10000"
                  />
                </div>
                
                <div className="aspect-ratio-control">
                  <button
                    className={`aspect-ratio-btn ${aspectRatioLocked ? 'active' : ''}`}
                    onClick={() => setAspectRatioLocked(!aspectRatioLocked)}
                    title={aspectRatioLocked ? 'יחס גובה-רוחב נעול' : 'יחס גובה-רוחב פתוח'}
                  >
                    {aspectRatioLocked ? '🔒' : '🔓'}
                  </button>
                </div>
                
                <div className="input-group">
                  <label>גובה (פיקסלים)</label>
                  <input
                    type="number"
                    value={newDimensions.height}
                    onChange={(e) => updateDimensions('height', e.target.value)}
                    min="1"
                    max="10000"
                  />
                </div>
              </div>
            </div>

            <div className="preset-sizes">
              <h3>📐 גדלים מוגדרים מראש</h3>
              <div className="preset-grid">
                {presetSizes.map((preset, index) => (
                  <button
                    key={index}
                    className="preset-btn"
                    onClick={() => applyPresetSize(preset)}
                    title={`${preset.width} × ${preset.height}`}
                  >
                    <span className="preset-name">{preset.name}</span>
                    <span className="preset-size">{preset.width} × {preset.height}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="advanced-settings">
              <h3>⚙️ הגדרות מתקדמות</h3>
              
              <div className="setting-group">
                <label>שיטת שינוי גודל</label>
                <select 
                  value={resizeMethod} 
                  onChange={(e) => setResizeMethod(e.target.value)}
                >
                  <option value="bilinear">ביליניארי (מומלץ)</option>
                  <option value="bicubic">ביקוביק (איכות גבוהה)</option>
                  <option value="nearest">פיקסל קרוב (חד)</option>
                </select>
              </div>

              <div className="setting-group">
                <label>פורמט קובץ</label>
                <select 
                  value={imageFormat} 
                  onChange={(e) => setImageFormat(e.target.value)}
                >
                  <option value="image/png">PNG (ללא דחיסה)</option>
                  <option value="image/jpeg">JPEG (דחיסה)</option>
                  <option value="image/webp">WebP (חדיש)</option>
                </select>
              </div>

              {(imageFormat === 'image/jpeg' || imageFormat === 'image/webp') && (
                <div className="setting-group">
                  <label>איכות תמונה: {Math.round(imageQuality * 100)}%</label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={imageQuality}
                    onChange={(e) => setImageQuality(parseFloat(e.target.value))}
                  />
                </div>
              )}
            </div>

            <div className="action-buttons">
              <button 
                className="resize-btn"
                onClick={resizeImage}
                disabled={loading || !newDimensions.width || !newDimensions.height}
              >
                {loading ? '🔄 משנה גודל...' : '🎯 שנה גודל תמונה'}
              </button>
              
              {resizedImage && (
                <>
                <button 
                  className="download-btn"
                  onClick={downloadImage}
                >
                  💾 הורד תמונה
                </button>
                <button 
                  className="save-library-btn"
                  onClick={saveToLibrary}
                >
                  📁 שמור בספרייה
                </button>
                </>
              )}
              
              <button 
                className="reset-btn"
                onClick={() => {
                  setSelectedImage(null)
                  setResizedImage(null)
                  setNewDimensions({ width: 0, height: 0 })
                }}
              >
                🔄 התחל מחדש
              </button>
            </div>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

export default ImageResizer 
