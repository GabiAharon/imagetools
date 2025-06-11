import React, { useState, useRef, useEffect } from 'react'
import { removeBackground } from '@imgly/background-removal'
import { useImageLibrary } from './ImageLibrary'
import './BackgroundRemover.css'

const BackgroundRemover = ({ transferToTab, pendingImageTransfer, availableTabs }) => {
  const { addImage } = useImageLibrary();
  const [selectedImage, setSelectedImage] = useState(null)
  const [processedImage, setProcessedImage] = useState(null)
  const [originalProcessedImage, setOriginalProcessedImage] = useState(null)
  const [currentBackground, setCurrentBackground] = useState(null) // רקע נוכחי
  const [customColorValue, setCustomColorValue] = useState('#ffffff') // צבע מותאם אישי
  const [customBackgroundImage, setCustomBackgroundImage] = useState(null) // תמונת רקע מותאמת אישית
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [method, setMethod] = useState('auto')
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [settings, setSettings] = useState({
    tolerance: 30,
    smoothing: 3
  })
  
  const fileInputRef = useRef(null)
  const backgroundInputRef = useRef(null)
  const canvasRef = useRef(null)

  const autoSaveToLibrary = (imageUrl, imageName) => {
    addImage(imageUrl, {
      name: imageName || `תמונה - ${new Date().toLocaleDateString('he-IL')}`,
      tool: 'background-removal',
      timestamp: new Date(),
      isOriginal: true
    });
  };

  useEffect(() => {
    const handleTransferImage = (event) => {
      if (event.detail && event.detail.targetTab === 'background') {
        const imageData = event.detail.imageData;
        const imageUrl = imageData.processedUrl || imageData.url || imageData.data;
        setSelectedImage(imageUrl);
        setProcessedImage(null);
        setOriginalProcessedImage(null);
        setCurrentBackground(null);
        setCustomColorValue('#ffffff');
        setCustomBackgroundImage(null);
        setProgress(0);
      }
    };

    const handleDirectTransfer = (event) => {
      if (event.detail && event.detail.imageData) {
        const imageData = event.detail.imageData;
        const imageUrl = imageData.processedUrl || imageData.url || imageData.data;
        setSelectedImage(imageUrl);
        setProcessedImage(null);
        setOriginalProcessedImage(null);
        setCurrentBackground(null);
        setCustomColorValue('#ffffff');
        setCustomBackgroundImage(null);
        setProgress(0);
      }
    };

    window.addEventListener('transferImage', handleTransferImage);
    window.addEventListener('transferImageToBackgroundRemover', handleDirectTransfer);
    return () => {
      window.removeEventListener('transferImage', handleTransferImage);
      window.removeEventListener('transferImageToBackgroundRemover', handleDirectTransfer);
    };
  }, []);

  const methods = [
    { id: 'auto', name: '🤖 AI אוטומטי', description: 'הסרת רקע חכמה עם בינה מלאכותית' },
    { id: 'green', name: '💚 ירוק', description: 'הסרת רקע ירוק (Green Screen)' },
    { id: 'blue', name: '💙 כחול', description: 'הסרת רקע כחול (Blue Screen)' },
    { id: 'white', name: '⚪ לבן', description: 'הסרת רקע לבן' },
    { id: 'black', name: '⚫ שחור', description: 'הסרת רקע שחור' }
  ]

  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageUrl = e.target.result;
        setSelectedImage(imageUrl)
        setProcessedImage(null)
        setOriginalProcessedImage(null)
        setCurrentBackground(null)
        setCustomColorValue('#ffffff')
        setCustomBackgroundImage(null)
        setProgress(0)
        
        autoSaveToLibrary(imageUrl, file.name);
      }
      reader.readAsDataURL(file)
    }
  }

  // טיפול בהעלאת תמונת רקע מותאמת אישית
  const handleBackgroundImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const backgroundImageUrl = e.target.result;
        setCustomBackgroundImage(backgroundImageUrl);
        addBackgroundImage(backgroundImageUrl);
      }
      reader.readAsDataURL(file)
    }
  }

  const colorDistance = (r1, g1, b1, r2, g2, b2) => {
    return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2)
  }

  const detectBackgroundColor = (imageData, width, height) => {
    const data = imageData.data
    const cornerSamples = []
    const sampleSize = 10
    
    for (let y = 0; y < sampleSize && y < height; y++) {
      for (let x = 0; x < sampleSize && x < width; x++) {
        const index = (y * width + x) * 4
        cornerSamples.push([data[index], data[index + 1], data[index + 2]])
      }
    }
    
    for (let y = 0; y < sampleSize && y < height; y++) {
      for (let x = Math.max(0, width - sampleSize); x < width; x++) {
        const index = (y * width + x) * 4
        cornerSamples.push([data[index], data[index + 1], data[index + 2]])
      }
    }
    
    let totalR = 0, totalG = 0, totalB = 0
    cornerSamples.forEach(([r, g, b]) => {
      totalR += r
      totalG += g
      totalB += b
    })
    
    const count = cornerSamples.length
    return [
      Math.round(totalR / count),
      Math.round(totalG / count),
      Math.round(totalB / count)
    ]
  }

  const removeImageBackgroundWithAI = async () => {
    if (!selectedImage) return

    setLoading(true)
    setProgress(10)

    try {
      const img = new Image()
      img.src = selectedImage
      await new Promise((resolve) => {
        img.onload = resolve
      })

      setProgress(30)

      const blob = await (await fetch(selectedImage)).blob()
      const resultBlob = await removeBackground(blob, {
        progress: (progress) => {
          setProgress(30 + Math.round(progress * 60))
        },
        model: 'medium',
        output: {
          format: 'image/png',
          quality: 1
        }
      })
      
      const processedDataUrl = URL.createObjectURL(resultBlob)
      setProcessedImage(processedDataUrl)
      setOriginalProcessedImage(processedDataUrl) // שמירת המקור
      setCurrentBackground(null)
      setProgress(100)
      
      setTimeout(() => setProgress(0), 1000)
      
    } catch (error) {
      console.error('שגיאה בהסרת הרקע:', error)
      alert('שגיאה בעיבוד התמונה. אנא נסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  const removeImageBackgroundWithCanvas = async () => {
    if (!selectedImage) return

    setLoading(true)
    setProgress(10)

    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = selectedImage
      })

      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      canvas.width = img.width
      canvas.height = img.height
      
      ctx.drawImage(img, 0, 0)
      setProgress(30)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data
      const width = canvas.width
      const height = canvas.height

      setProgress(50)

      let targetColor = [255, 255, 255]
      
      switch (method) {
        case 'green':
          targetColor = [0, 255, 0]
          break
        case 'blue':
          targetColor = [0, 0, 255]
          break
        case 'white':
          targetColor = [255, 255, 255]
          break
        case 'black':
          targetColor = [0, 0, 0]
          break
        default:
          targetColor = detectBackgroundColor(imageData, width, height)
          break
      }

      setProgress(70)

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        
        let shouldRemove = false
        
        if (method === 'green') {
          shouldRemove = g > r + 30 && g > b + 30 && g > 100
        } else if (method === 'blue') {
          shouldRemove = b > r + 30 && b > g + 30 && b > 100
        } else if (method === 'white') {
          shouldRemove = r > 230 && g > 230 && b > 230
        } else if (method === 'black') {
          shouldRemove = r < 25 && g < 25 && b < 25
        } else {
          const distance = colorDistance(r, g, b, targetColor[0], targetColor[1], targetColor[2])
          shouldRemove = distance < settings.tolerance
        }

        if (shouldRemove) {
          data[i + 3] = 0
        }
      }

      setProgress(90)

      if (settings.smoothing > 0) {
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const index = (y * width + x) * 4
            const alpha = data[index + 3]
            
            if (alpha > 0 && alpha < 255) {
              const neighbors = [
                data[((y-1) * width + x) * 4 + 3],
                data[((y+1) * width + x) * 4 + 3],
                data[(y * width + (x-1)) * 4 + 3],
                data[(y * width + (x+1)) * 4 + 3]
              ]
              
              const avgAlpha = neighbors.reduce((sum, a) => sum + a, 0) / 4
              const smoothFactor = settings.smoothing / 10
              data[index + 3] = Math.round(alpha * (1 - smoothFactor) + avgAlpha * smoothFactor)
            }
          }
        }
      }

      ctx.putImageData(imageData, 0, 0)
      
      const processedDataUrl = canvas.toDataURL('image/png')
      setProcessedImage(processedDataUrl)
      setOriginalProcessedImage(processedDataUrl) // שמירת המקור
      setCurrentBackground(null)
      setProgress(100)
      
      setTimeout(() => setProgress(0), 1000)
      
    } catch (error) {
      console.error('שגיאה בהסרת הרקע:', error)
      alert('שגיאה בעיבוד התמונה. אנא נסה שוב.')
    } finally {
      setLoading(false)
    }
  }

  const removeImageBackground = async () => {
    if (method === 'auto') {
      await removeImageBackgroundWithAI()
    } else {
      await removeImageBackgroundWithCanvas()
    }
  }

  const downloadImage = () => {
    if (!processedImage) return
    
    const link = document.createElement('a')
    link.href = processedImage
    link.download = `no-bg-${Date.now()}.png`
    link.click()
  }

  const saveToLibrary = () => {
    if (!processedImage) return;
    
    addImage(processedImage, {
      name: `הסרת רקע - ${new Date().toLocaleDateString('he-IL')}`,
      tool: 'background-removal',
      timestamp: new Date()
    });
  }

  // הוספת רקע חדש - תיקון הבאג על ידי שמירת התמונה המקורית
  const addBackground = (color) => {
    if (!originalProcessedImage) return; // משתמש בתמונה המקורית

    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')
    
    const img = new Image()
    img.onload = () => {
      tempCanvas.width = img.width
      tempCanvas.height = img.height
      
      // צבע רקע
      tempCtx.fillStyle = color
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)
      
      // ציור התמונה מעל
      tempCtx.drawImage(img, 0, 0)
      
      const newDataUrl = tempCanvas.toDataURL('image/png')
      setProcessedImage(newDataUrl)
      setCurrentBackground(color)
    }
    img.src = originalProcessedImage // משתמש בתמונה המקורית תמיד
  }

  // הוספת תמונה כרקע
  const addBackgroundImage = (imageUrl) => {
    if (!originalProcessedImage) return;

    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')
    
    const foregroundImg = new Image()
    foregroundImg.onload = () => {
      tempCanvas.width = foregroundImg.width
      tempCanvas.height = foregroundImg.height
      
      // טעינת תמונת הרקע
      const backgroundImg = new Image()
      backgroundImg.onload = () => {
        // ציור תמונת הרקע (מותאמת לגודל)
        tempCtx.drawImage(backgroundImg, 0, 0, tempCanvas.width, tempCanvas.height)
        
        // ציור התמונה החלולה מעל
        tempCtx.drawImage(foregroundImg, 0, 0)
        
        const newDataUrl = tempCanvas.toDataURL('image/png')
        setProcessedImage(newDataUrl)
        setCurrentBackground('custom-image')
      }
      backgroundImg.src = imageUrl
    }
    foregroundImg.src = originalProcessedImage
  }

  // הסרת רקע ושמירת המקור
  const removeOriginalBackground = () => {
    if (!originalProcessedImage) return;
    setProcessedImage(originalProcessedImage);
    setCurrentBackground(null);
  }

  const handleImportFromLibrary = (libraryImage) => {
    setSelectedImage(libraryImage.url || libraryImage.processedUrl);
    setProcessedImage(null);
    setProgress(0);
  };

  const handleExportToLibrary = () => {
    if (processedImage) {
      const exportData = {
        id: Date.now(),
        name: `background-removed-${Date.now()}.png`,
        url: processedImage,
        processedUrl: processedImage,
        source: 'background-remover',
        processedAt: new Date()
      };

    }
  };

  useEffect(() => {
    if (pendingImageTransfer && pendingImageTransfer.imageData) {
      const transferredImages = Array.isArray(pendingImageTransfer.imageData) 
        ? pendingImageTransfer.imageData 
        : [pendingImageTransfer.imageData];
      
      if (transferredImages.length > 0) {
        const firstImage = transferredImages[0];
        setSelectedImage(firstImage.url || firstImage.processedUrl);
        setProcessedImage(null);
        setProgress(0);
      }
    }
  }, [pendingImageTransfer]);

  const resetAll = () => {
    setSelectedImage(null);
    setProcessedImage(null);
    setOriginalProcessedImage(null);
    setCurrentBackground(null);
    setCustomColorValue('#ffffff');
    setCustomBackgroundImage(null);
    setShowFullscreen(false);
    setLoading(false);
    setProgress(0);
    setMethod('auto');
    setSettings({
      tolerance: 30,
      smoothing: 3
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (backgroundInputRef.current) {
      backgroundInputRef.current.value = '';
    }
  };

  return (
    <div className="background-remover">
      <div className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ margin: 0 }}>🎭 הסרת רקע מתקדמת</h2>
          {selectedImage && (
            <button 
              onClick={resetAll}
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
              🗑️ תמונה חדשה
            </button>
          )}
        </div>
        <p>הסר רקע מתמונות בעזרת AI או שיטות ידניות</p>
      </div>

      {processedImage && (
        <div style={{
          background: '#f8f9fa',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #dee2e6'
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>📚 שמור בספרייה:</h4>
          <button
            onClick={() => {
              handleExportToLibrary();
              alert('התמונה המעובדת נשמרה בספרייה!');
            }}
            style={{
              padding: '8px 16px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            💾 שמור תמונה מעובדת
          </button>
        </div>
      )}

      <div className="upload-section">
        <div 
          className="upload-area"
          onClick={() => fileInputRef.current?.click()}
        >
          {selectedImage ? (
            <img src={selectedImage} alt="נבחר" className="preview-image" />
          ) : (
            <div className="upload-placeholder">
              <div className="upload-icon">🖼️</div>
              <p>לחץ לבחירת תמונה</p>
              <span>תומך ב-JPG, PNG, WebP</span>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="file-input"
        />
      </div>

      {selectedImage && (
        <div className="controls-section">
          <div className="method-selection">
            <h3>🔧 שיטת הסרה:</h3>
            <div className="methods-grid">
              {methods.map(m => (
                <button
                  key={m.id}
                  className={`method-btn ${method === m.id ? 'active' : ''}`}
                  onClick={() => setMethod(m.id)}
                >
                  <span className="method-name">{m.name}</span>
                  <span className="method-desc">{m.description}</span>
                </button>
              ))}
            </div>
          </div>

          {method !== 'auto' && (
          <div className="settings-panel">
            <div className="setting-group">
              <label>🎯 רגישות: {settings.tolerance}</label>
              <input
                type="range"
                min="10"
                max="80"
                value={settings.tolerance}
                onChange={(e) => setSettings(prev => ({...prev, tolerance: parseInt(e.target.value)}))}
              />
              <small>נמוך = מדויק יותר | גבוה = כולל יותר אזורים</small>
            </div>

            <div className="setting-group">
              <label>✨ החלקת קצוות: {settings.smoothing}</label>
              <input
                type="range"
                min="0"
                max="5"
                value={settings.smoothing}
                onChange={(e) => setSettings(prev => ({...prev, smoothing: parseInt(e.target.value)}))}
              />
              <small>0 = קצוות חדים | 5 = קצוות רכים</small>
            </div>
          </div>
          )}

          <button 
            className="process-btn"
            onClick={removeImageBackground}
            disabled={loading}
          >
            {loading ? `🔄 מעבד... ${progress}%` : '🎭 הסר רקע'}
          </button>
        </div>
      )}

      {loading && (
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{width: `${progress}%`}}></div>
          </div>
          <p>
            {progress < 30 ? 'טוען תמונה...' : 
             progress < 50 ? 'מנתח תמונה...' : 
             progress < 70 ? 'מסיר רקע...' : 
             progress < 90 ? 'מעבד פיקסלים...' : 
             'מחליק קצוות...'}
          </p>
        </div>
      )}

      {processedImage && (
        <div className="result-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>✅ תוצאה:</h3>
            <button
              onClick={() => setShowFullscreen(true)}
              style={{
                padding: '8px 16px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              🔍 הצג בגודל מלא
            </button>
          </div>
          <div className="result-container">
            <img src={processedImage} alt="עובד" className="result-image" />
            <div className="transparency-pattern"></div>
          </div>
          
          <div className="result-actions">
            <div>
              <button className="download-btn" onClick={downloadImage}>
                💾 הורד PNG
              </button>
              <button className="save-library-btn" onClick={saveToLibrary}>
                📁 שמור בספרייה
              </button>
            </div>
            <div className="background-options">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span>🎨 רקע חדש:</span>
                {currentBackground && (
                  <button 
                    onClick={removeOriginalBackground}
                    style={{
                      padding: '6px 12px',
                      background: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    🚫 הסר רקע
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => addBackground('#ffffff')} className="bg-white" title="לבן" style={{ border: currentBackground === '#ffffff' ? '3px solid #007bff' : '1px solid #ccc' }}>⚪</button>
                <button onClick={() => addBackground('#000000')} className="bg-black" title="שחור" style={{ border: currentBackground === '#000000' ? '3px solid #007bff' : '1px solid #ccc' }}>⚫</button>
                <button onClick={() => addBackground('#ff4757')} className="bg-red" title="אדום" style={{ border: currentBackground === '#ff4757' ? '3px solid #007bff' : '1px solid #ccc' }}>🔴</button>
                <button onClick={() => addBackground('#2ed573')} className="bg-green" title="ירוק" style={{ border: currentBackground === '#2ed573' ? '3px solid #007bff' : '1px solid #ccc' }}>🟢</button>
                <button onClick={() => addBackground('#3742fa')} className="bg-blue" title="כחול" style={{ border: currentBackground === '#3742fa' ? '3px solid #007bff' : '1px solid #ccc' }}>🔵</button>
                <button onClick={() => addBackground('#f39c12')} className="bg-orange" title="כתום" style={{ border: currentBackground === '#f39c12' ? '3px solid #007bff' : '1px solid #ccc' }}>🟠</button>
                <button onClick={() => addBackground('#9b59b6')} className="bg-purple" title="סגול" style={{ border: currentBackground === '#9b59b6' ? '3px solid #007bff' : '1px solid #ccc' }}>🟣</button>
                <button onClick={() => addBackground('#f1c40f')} className="bg-yellow" title="צהוב" style={{ border: currentBackground === '#f1c40f' ? '3px solid #007bff' : '1px solid #ccc' }}>🟡</button>
                <input 
                  type="color" 
                  value={customColorValue}
                  onChange={(e) => {
                    setCustomColorValue(e.target.value);
                    addBackground(e.target.value);
                  }}
                  title="בחר צבע מותאם אישית"
                  style={{
                    width: '30px',
                    height: '30px',
                    border: currentBackground === customColorValue ? '3px solid #007bff' : '1px solid #ccc',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    marginLeft: '5px'
                  }}
                />
              </div>
              
              <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>🖼️ רקע מותאם אישית:</span>
                <button
                  onClick={() => backgroundInputRef.current?.click()}
                  style={{
                    padding: '8px 16px',
                    background: currentBackground === 'custom-image' ? '#007bff' : '#6c757d',
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
                  📂 העלה תמונה
                </button>
                <input
                  ref={backgroundInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBackgroundImageUpload}
                  style={{ display: 'none' }}
                />
                {customBackgroundImage && (
                  <img 
                    src={customBackgroundImage} 
                    alt="רקע מותאם" 
                    style={{
                      width: '40px',
                      height: '40px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      border: currentBackground === 'custom-image' ? '3px solid #007bff' : '1px solid #ccc',
                      cursor: 'pointer'
                    }}
                    onClick={() => addBackgroundImage(customBackgroundImage)}
                  />
                )}
              </div>
            </div>
          </div>
          
          {availableTabs && availableTabs.length > 0 && (
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
                    onClick={() => transferToTab(tab.id, [{
                      id: 'current',
                      name: 'background-removed.png',
                      url: processedImage,
                      processedUrl: processedImage
                    }])}
                    style={{
                      padding: '8px 12px',
                      background: '#007bff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px'
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
                התמונה המעובדת תועבר ישירות ללשונית שתבחר
              </p>
            </div>
          )}
        </div>
      )}

      <canvas ref={canvasRef} style={{display: 'none'}} />
      
      {/* מודל הצגה בגודל מלא */}
      {showFullscreen && processedImage && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.9)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            cursor: 'pointer'
          }}
          onClick={() => setShowFullscreen(false)}
        >
          <div style={{ position: 'relative', maxWidth: '95%', maxHeight: '95%' }}>
            <button
              onClick={() => setShowFullscreen(false)}
              style={{
                position: 'absolute',
                top: '-50px',
                right: '0',
                background: '#ffffff',
                color: '#000000',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                cursor: 'pointer',
                fontSize: '20px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10000
              }}
            >
              ✕
            </button>
            <img 
              src={processedImage} 
              alt="תצוגה בגודל מלא" 
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                boxShadow: '0 0 20px rgba(255,255,255,0.3)'
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <div style={{
              position: 'absolute',
              bottom: '-60px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'white',
              fontSize: '14px',
              textAlign: 'center',
              background: 'rgba(0,0,0,0.7)',
              padding: '8px 16px',
              borderRadius: '20px'
            }}>
              לחץ בכל מקום כדי לסגור
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BackgroundRemover 
