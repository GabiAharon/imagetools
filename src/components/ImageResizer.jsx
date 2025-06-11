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
  
  // הוספת state לבחירה מרובה
  const [selectedSizes, setSelectedSizes] = useState(new Set())
  const [resizedImages, setResizedImages] = useState([])
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState('')
  
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
    { name: 'פביקון', width: 32, height: 32 },
    { name: 'אייקון קטן', width: 64, height: 64 },
    { name: 'אייקון בינוני', width: 128, height: 128 },
    { name: 'אייקון גדול', width: 256, height: 256 },
    { name: 'תמונת פרופיל', width: 512, height: 512 },
    { name: 'VGA', width: 640, height: 480 },
    { name: 'SVGA', width: 800, height: 600 },
    { name: 'XGA', width: 1024, height: 768 },
    { name: 'HD', width: 1280, height: 720 },
    { name: 'WXGA', width: 1366, height: 768 },
    { name: 'Full HD', width: 1920, height: 1080 },
    { name: '2K', width: 2560, height: 1440 },
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
          setResizedImages([])
          setSelectedSizes(new Set())
          
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

  // פונקציות לבחירה מרובה של גדלים
  const handleSizeSelection = (sizeIndex) => {
    const newSelectedSizes = new Set(selectedSizes)
    if (newSelectedSizes.has(sizeIndex)) {
      newSelectedSizes.delete(sizeIndex)
    } else {
      newSelectedSizes.add(sizeIndex)
    }
    setSelectedSizes(newSelectedSizes)
  }

  const selectAllSizes = () => {
    if (selectedSizes.size === presetSizes.length) {
      setSelectedSizes(new Set())
    } else {
      setSelectedSizes(new Set(Array.from({ length: presetSizes.length }, (_, i) => i)))
    }
  }

  // שינוי גודל לכמה גדלים בבת אחת
  const resizeToMultipleSizes = async () => {
    if (!selectedImage || selectedSizes.size === 0) return

    setIsBatchProcessing(true)
    const results = []

    const img = new Image()
    await new Promise((resolve) => {
      img.onload = resolve
      img.src = selectedImage
    })

    for (const sizeIndex of selectedSizes) {
      const size = presetSizes[sizeIndex]
      
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      
      canvas.width = size.width
      canvas.height = size.height
      
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

      // שינוי גודל מתקדם אם נדרש
      if (originalDimensions.width > size.width * 2 || originalDimensions.height > size.height * 2) {
        resizeInStepsToCanvas(img, ctx, originalDimensions, size)
      } else {
        ctx.drawImage(img, 0, 0, size.width, size.height)
      }

      const dataUrl = canvas.toDataURL(imageFormat, imageQuality)
      const extension = imageFormat === 'image/png' ? 'png' : imageFormat === 'image/jpeg' ? 'jpg' : 'webp'
      
      results.push({
        name: size.name,
        size: `${size.width}×${size.height}`,
        dataUrl: dataUrl,
        filename: `resized_${size.name}_${size.width}x${size.height}.${extension}`,
        width: size.width,
        height: size.height
      })
    }

    setResizedImages(results)
    setIsBatchProcessing(false)
  }

  // פונקציה עזר לשינוי גודל הדרגתי לcanvas חיצוני
  const resizeInStepsToCanvas = (img, finalCtx, originalSize, targetSize) => {
    let currentWidth = originalSize.width
    let currentHeight = originalSize.height
    
    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')
    
    tempCanvas.width = currentWidth
    tempCanvas.height = currentHeight
    tempCtx.drawImage(img, 0, 0)
    
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
      
      tempCanvas.width = currentWidth
      tempCanvas.height = currentHeight
      tempCtx.clearRect(0, 0, currentWidth, currentHeight)
      tempCtx.drawImage(newCanvas, 0, 0)
    }
    
    finalCtx.drawImage(tempCanvas, 0, 0, targetSize.width, targetSize.height)
  }

  // הורדת כל התמונות כ-ZIP
  const downloadAllAsZip = async () => {
    if (resizedImages.length === 0) return
    
    try {
      const JSZip = window.JSZip
      if (!JSZip) {
        alert('טוען ספריית ZIP...')
        return
      }
      
      const zip = new JSZip()
      
      for (const image of resizedImages) {
        const response = await fetch(image.dataUrl)
        const blob = await response.blob()
        zip.file(image.filename, blob)
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      
      const link = document.createElement('a')
      link.href = URL.createObjectURL(zipBlob)
      link.download = `resized_images_${Date.now()}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
    } catch (error) {
      console.error('שגיאה בהורדת ZIP:', error)
      alert('שגיאה ביצירת קובץ ZIP. אנא נסה שוב.')
    }
  }

  // הורדת תמונה יחידה
  const downloadSingleResizedImage = (image) => {
    const link = document.createElement('a')
    link.href = image.dataUrl
    link.download = image.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // שמירת תמונה יחידה בספרייה
  const saveSingleToLibrary = (image) => {
    addImage(image.dataUrl, {
      name: `${image.name} ${image.size}`,
      tool: 'image-resizer-batch',
      originalName: image.filename,
      timestamp: new Date()
    })
    setShowSuccessMessage('תמונה נשמרה בספרייה')
    setTimeout(() => setShowSuccessMessage(''), 3000)
  }

  // שמירת כל התמונות בספרייה
  const saveAllToLibrary = () => {
    resizedImages.forEach((image, index) => {
      addImage(image.dataUrl, {
        name: `${image.name} ${image.size} - #${index + 1}`,
        tool: 'image-resizer-batch',
        originalName: image.filename,
        timestamp: new Date()
      })
    })
    setShowSuccessMessage(`נשמרו ${resizedImages.length} תמונות בספרייה`)
    setTimeout(() => setShowSuccessMessage(''), 3000)
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
        <p>שנה את גודל התמונות שלך עם דיוק פיקסל ואיכות מקצועית - עכשיו עם בחירה מרובה!</p>
      </div>

      {/* הודעת הצלחה */}
      {showSuccessMessage && (
        <div style={{
          background: 'linear-gradient(135deg, #d4edda, #c3e6cb)',
          color: '#155724',
          padding: '12px 20px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #c3e6cb',
          textAlign: 'center',
          fontWeight: '600'
        }}>
          ✅ {showSuccessMessage}
        </div>
      )}

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
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: '0', marginLeft: '15px' }}>📐 גדלים מוגדרים מראש:</h3>
                <button
                  onClick={selectAllSizes}
                  style={{
                    background: selectedSizes.size === presetSizes.length ? '#dc3545' : '#007bff',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  {selectedSizes.size === presetSizes.length ? '❌ בטל הכל' : '✅ בחר הכל'}
                </button>
              </div>
              
              <div className="preset-grid" style={{ marginBottom: '20px' }}>
                {presetSizes.map((preset, index) => (
                  <label
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px',
                      border: selectedSizes.has(index) ? '2px solid #007bff' : '2px solid #e0e0e0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: selectedSizes.has(index) ? '#f0f8ff' : '#fff',
                      transition: 'all 0.2s',
                      marginBottom: '5px'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSizes.has(index)}
                      onChange={() => handleSizeSelection(index)}
                      style={{ marginLeft: '10px', transform: 'scale(1.2)' }}
                    />
                    <div style={{ flex: 1 }}>
                      <span style={{ 
                        fontWeight: selectedSizes.has(index) ? '600' : '400',
                        display: 'block'
                      }}>
                        {preset.name}
                      </span>
                      <span style={{ 
                        fontSize: '12px', 
                        color: '#666',
                        display: 'block'
                      }}>
                        {preset.width} × {preset.height}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        applyPresetSize(preset)
                      }}
                      style={{
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '10px'
                      }}
                    >
                      שימוש יחיד
                    </button>
                  </label>
                ))}
              </div>

              {selectedSizes.size > 0 && (
                <div style={{
                  background: '#e7f5e7',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #28a745',
                  fontSize: '14px',
                  marginBottom: '15px'
                }}>
                  ✅ נבחרו {selectedSizes.size} גדלים לעיבוד
                </div>
              )}

              {selectedSizes.size > 0 && (
                <button 
                  onClick={resizeToMultipleSizes}
                  disabled={isBatchProcessing}
                  style={{
                    background: isBatchProcessing 
                      ? 'linear-gradient(135deg, #6c757d, #5a6268)' 
                      : 'linear-gradient(135deg, #28a745, #1e7e34)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: isBatchProcessing ? 'not-allowed' : 'pointer',
                    marginBottom: '20px',
                    fontSize: '16px',
                    width: '100%'
                  }}
                >
                  {isBatchProcessing ? '⏳ מעבד...' : `📦 שנה גודל ל-${selectedSizes.size} גדלים`}
                </button>
              )}
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
                  setResizedImages([])
                  setSelectedSizes(new Set())
                  setShowSuccessMessage('')
                }}
              >
                🔄 התחל מחדש
              </button>
            </div>
          </div>
          
          {/* תצוגת תוצאות מרובות */}
          {resizedImages.length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px', gap: '10px' }}>
                <h3 style={{ margin: '0' }}>📁 תוצאות ({resizedImages.length} תמונות):</h3>
                <button 
                  onClick={downloadAllAsZip}
                  style={{
                    background: 'linear-gradient(135deg, #ff6b35, #f7931e)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  📦 הורד הכל כ-ZIP
                </button>
                <button 
                  onClick={saveAllToLibrary}
                  style={{
                    background: 'linear-gradient(135deg, #17a2b8, #138496)',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  📚 שמור הכל בספרייה
                </button>
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                gap: '15px' 
              }}>
                {resizedImages.map((image, index) => (
                  <div key={index} style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '15px',
                    background: '#fff',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}>
                    <img 
                      src={image.dataUrl} 
                      alt={image.name}
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '150px', 
                        objectFit: 'contain',
                        marginBottom: '10px',
                        border: '1px solid #eee'
                      }} 
                    />
                    <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '5px' }}>
                      {image.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
                      {image.size}
                    </div>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                      <button
                        onClick={() => downloadSingleResizedImage(image)}
                        style={{
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        💾 הורד
                      </button>
                      <button
                        onClick={() => saveSingleToLibrary(image)}
                        style={{
                          background: '#17a2b8',
                          color: 'white',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        📚 ספרייה
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

export default ImageResizer 
