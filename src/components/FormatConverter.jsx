import React, { useState, useRef, useEffect } from "react";
import { useImageLibrary } from './ImageLibrary';

const FormatConverter = ({ transferToTab, pendingImageTransfer, availableTabs }) => {
  const { saveToLibrary: saveImageToLibrary } = useImageLibrary();

  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [outputFormat, setOutputFormat] = useState("png");
  const [quality, setQuality] = useState(0.9);
  const [convertedImage, setConvertedImage] = useState(null);
  const [selectedSizes, setSelectedSizes] = useState(new Set());
  const [convertedImages, setConvertedImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState('');
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const formats = [
    { value: "png", label: "PNG (ללא דחיסה)" },
    { value: "jpeg", label: "JPEG (דחיסה)" },
    { value: "webp", label: "WebP (מתקדם)" },
    { value: "bmp", label: "BMP (בסיסי)" }
  ];

  const availableSizes = [
    { label: "32x32 (פביקון)", width: 32, height: 32 },
    { label: "64x64 (אייקון קטן)", width: 64, height: 64 },
    { label: "128x128 (אייקון)", width: 128, height: 128 },
    { label: "256x256 (אייקון גדול)", width: 256, height: 256 },
    { label: "512x512 (תמונת פרופיל)", width: 512, height: 512 },
    { label: "640x480 (VGA)", width: 640, height: 480 },
    { label: "800x600 (SVGA)", width: 800, height: 600 },
    { label: "1024x768 (XGA)", width: 1024, height: 768 },
    { label: "1280x720 (HD)", width: 1280, height: 720 },
    { label: "1366x768 (WXGA)", width: 1366, height: 768 },
    { label: "1920x1080 (Full HD)", width: 1920, height: 1080 },
    { label: "2560x1440 (2K)", width: 2560, height: 1440 },
    { label: "גודל מקורי", width: null, height: null }
  ];

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setConvertedImage(null);
      setConvertedImages([]);
      setSelectedSizes(new Set());
      
      // שמירה אוטומטית לספרייה
      const imageToSave = {
        id: Date.now() + Math.random(),
        name: file.name,
        url: url,
        source: 'format-converter-upload',
        metadata: {
          tool: 'המרת פורמט',
          originalFormat: file.name.split('.').pop() || 'unknown',
          uploadedAt: new Date().toISOString()
        }
      };
      saveImageToLibrary(imageToSave);
    }
  };

  const handleSizeSelection = (sizeIndex) => {
    const newSelectedSizes = new Set(selectedSizes);
    if (newSelectedSizes.has(sizeIndex)) {
      newSelectedSizes.delete(sizeIndex);
    } else {
      newSelectedSizes.add(sizeIndex);
    }
    setSelectedSizes(newSelectedSizes);
  };

  const resizeImage = (img, targetWidth, targetHeight) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    let { width, height } = img;
    
    if (targetWidth && targetHeight) {
      // שמירה על יחס רוחב-גובה
      const aspectRatio = width / height;
      const targetAspectRatio = targetWidth / targetHeight;
      
      if (aspectRatio > targetAspectRatio) {
        width = targetWidth;
        height = targetWidth / aspectRatio;
      } else {
        height = targetHeight;
        width = targetHeight * aspectRatio;
      }
    }
    
    canvas.width = width;
    canvas.height = height;
    
    ctx.drawImage(img, 0, 0, width, height);
    
    return canvas;
  };

  const convertMultipleSizes = async () => {
    if (!imageFile || selectedSizes.size === 0) return;
    
    setIsProcessing(true);
    const results = [];
    
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = imageUrl;
    });
    
    for (const sizeIndex of selectedSizes) {
      const size = availableSizes[sizeIndex];
      let canvas;
      
      if (size.width === null || size.height === null) {
        // גודל מקורי
        canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
      } else {
        canvas = resizeImage(img, size.width, size.height);
      }
      
      const mimeType = `image/${outputFormat}`;
      const dataUrl = canvas.toDataURL(mimeType, quality);
      
      const filename = size.width === null 
        ? `converted_original.${outputFormat}`
        : `converted_${size.width}x${size.height}.${outputFormat}`;
        
      results.push({
        size: size.label,
        dataUrl: dataUrl,
        filename: filename
      });
    }
    
    setConvertedImages(results);
    setIsProcessing(false);
  };

  const convertFormat = () => {
    if (!imageFile) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.width;
      canvas.height = img.height;
      
      ctx.drawImage(img, 0, 0);
      
      const mimeType = `image/${outputFormat}`;
      const dataUrl = canvas.toDataURL(mimeType, quality);
      setConvertedImage(dataUrl);
    };
    img.src = imageUrl;
  };

  const downloadImage = () => {
    if (!convertedImage) return;
    
    const link = document.createElement('a');
    link.href = convertedImage;
    link.download = `converted.${outputFormat}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadAllAsZip = async () => {
    if (convertedImages.length === 0) return;
    
    try {
      // יצירת ZIP באמצעות JSZip (נטען דרך CDN)
      const JSZip = window.JSZip;
      if (!JSZip) {
        alert('טוען ספריית ZIP...');
        return;
      }
      
      const zip = new JSZip();
      
      // הוספת כל התמונות ל-ZIP
      for (const image of convertedImages) {
        // המרת data URL לבייטים
        const response = await fetch(image.dataUrl);
        const blob = await response.blob();
        zip.file(image.filename, blob);
      }
      
      // יצירת קובץ ZIP
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // הורדת הקובץ
      const link = document.createElement('a');
      link.href = URL.createObjectURL(zipBlob);
      link.download = `converted_images_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('שגיאה בהורדת ZIP:', error);
      alert('שגיאה ביצירת קובץ ZIP. אנא נסה שוב.');
    }
  };

  const downloadSingleImage = (image) => {
    const link = document.createElement('a');
    link.href = image.dataUrl;
    link.download = image.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Save to library
  const saveToLibrary = () => {
    if (convertedImage) {
      const imageToSave = {
        id: Date.now() + Math.random(),
        name: `converted.${outputFormat}`,
        url: imageUrl,
        processedUrl: convertedImage,
        source: 'format-converter',
        processed: true,
        metadata: {
          tool: 'המרת פורמט',
          originalFormat: imageFile?.name?.split('.').pop() || 'unknown',
          convertedFormat: outputFormat,
          quality: outputFormat === 'jpeg' || outputFormat === 'webp' ? quality : 1,
          processedAt: new Date().toISOString()
        }
      };

      saveImageToLibrary(imageToSave);
    }
  };

  // Listen for image transfers from library
  useEffect(() => {
    const handleTransfer = (event) => {
      const { imageData } = event.detail;
      if (imageData && (imageData.url || imageData.processedUrl || imageData.data)) {
        const imageUrl = imageData.processedUrl || imageData.url || imageData.data;
        setImageUrl(imageUrl);
        setImageFile({ name: imageData.name || 'transferred-image' });
        setConvertedImage(null);
      }
    };

    const handleDirectTransfer = (event) => {
      const { imageData } = event.detail;
      if (imageData && (imageData.url || imageData.processedUrl || imageData.data)) {
        const imageUrl = imageData.processedUrl || imageData.url || imageData.data;
        setImageUrl(imageUrl);
        setImageFile({ name: imageData.name || 'transferred-image' });
        setConvertedImage(null);
      }
    };

    window.addEventListener('transferImage', handleTransfer);
    window.addEventListener('transferImageToFormatConverter', handleDirectTransfer);
    return () => {
      window.removeEventListener('transferImage', handleTransfer);
      window.removeEventListener('transferImageToFormatConverter', handleDirectTransfer);
    };
  }, []);

  // Handle pending transfers from other tabs or library
  useEffect(() => {
    if (pendingImageTransfer && pendingImageTransfer.imageData) {
      const firstImage = Array.isArray(pendingImageTransfer.imageData) 
        ? pendingImageTransfer.imageData[0] 
        : pendingImageTransfer.imageData;
      
      if (firstImage && (firstImage.url || firstImage.processedUrl)) {
        setImageUrl(firstImage.url || firstImage.processedUrl);
        setImageFile({ name: firstImage.name || 'transferred-image' });
        setConvertedImage(null);
      }
    }
  }, [pendingImageTransfer]);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h2>🔄 המרת פורמט תמונות</h2>
      <p>המר תמונות בין פורמטים שונים עם אפשרות בחירת גדלים מרובים</p>

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

      {!imageUrl ? (
        <div 
          style={{
            border: '2px dashed #007bff',
            borderRadius: '12px',
            padding: '40px 20px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #f0f8ff, #e6f3ff)',
            cursor: 'pointer',
            marginBottom: '20px'
          }}
          onClick={() => fileInputRef.current.click()}
        >
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔄</div>
          <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '5px' }}>
            בחרו תמונה להמרה
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            תומך ב-JPG, PNG, GIF, WebP, BMP
          </div>
          <div style={{ fontSize: '12px', color: '#007bff', fontWeight: '600' }}>
            💡 חדש: בחר כמה גדלים יחד והורד הכל כ-ZIP!
          </div>
        </div>
      ) : (
        <div>
          <img src={imageUrl} alt="תמונה מקורית" style={{ maxWidth: '100%', marginBottom: '20px' }} />
          
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
              פורמט יעד:
            </label>
            <select 
              value={outputFormat} 
              onChange={(e) => setOutputFormat(e.target.value)}
              style={{ padding: '8px', borderRadius: '6px', border: '2px solid #e0e0e0' }}
            >
              {formats.map(format => (
                <option key={format.value} value={format.value}>
                  {format.label}
                </option>
              ))}
            </select>
          </div>

          {(outputFormat === 'jpeg' || outputFormat === 'webp') && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '10px', fontWeight: '600' }}>
                איכות: {Math.round(quality * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {/* בחירת גדלים מרובים */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ margin: '0', marginLeft: '15px', color: '#333' }}>📏 בחירת גדלים:</h3>
              <button
                onClick={() => {
                  if (selectedSizes.size === availableSizes.length) {
                    setSelectedSizes(new Set());
                  } else {
                    setSelectedSizes(new Set(Array.from({ length: availableSizes.length }, (_, i) => i)));
                  }
                }}
                style={{
                  background: selectedSizes.size === availableSizes.length ? '#dc3545' : '#007bff',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {selectedSizes.size === availableSizes.length ? '❌ בטל הכל' : '✅ בחר הכל'}
              </button>
            </div>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '10px',
              marginBottom: '15px'
            }}>
              {availableSizes.map((size, index) => (
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
                    transition: 'all 0.2s'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedSizes.has(index)}
                    onChange={() => handleSizeSelection(index)}
                    style={{ marginLeft: '10px', transform: 'scale(1.2)' }}
                  />
                  <span style={{ fontWeight: selectedSizes.has(index) ? '600' : '400' }}>
                    {size.label}
                  </span>
                </label>
              ))}
            </div>
            
            {selectedSizes.size > 0 && (
              <div style={{
                background: '#e7f5e7',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #28a745',
                fontSize: '14px'
              }}>
                ✅ נבחרו {selectedSizes.size} גדלים
              </div>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            {/* כפתור המרה רגילה */}
            <button 
              onClick={convertFormat}
              style={{
                background: 'linear-gradient(135deg, #007bff, #0056b3)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                marginRight: '10px',
                marginBottom: '10px'
              }}
            >
              🔄 המר פורמט (גודל מקורי)
            </button>

            {/* כפתור המרה מרובה */}
            {selectedSizes.size > 0 && (
              <button 
                onClick={convertMultipleSizes}
                disabled={isProcessing}
                style={{
                  background: isProcessing 
                    ? 'linear-gradient(135deg, #6c757d, #5a6268)' 
                    : 'linear-gradient(135deg, #28a745, #1e7e34)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  marginRight: '10px',
                  marginBottom: '10px'
                }}
              >
                {isProcessing ? '⏳ מעבד...' : `📦 המר ${selectedSizes.size} גדלים`}
              </button>
            )}
            
            {convertedImage && (
              <>
              <button 
                onClick={downloadImage}
                style={{
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                    cursor: 'pointer',
                    marginRight: '10px'
                }}
              >
                💾 הורדה
              </button>
                
                <button 
                  onClick={saveToLibrary}
                  style={{
                    background: '#17a2b8',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  📚 שמור בספרייה
                </button>
              </>
            )}
          </div>

          {/* תצוגת תוצאות מרובות */}
          {convertedImages.length > 0 && (
            <div style={{ marginTop: '30px' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: '0', marginLeft: '15px' }}>📁 תוצאות ({convertedImages.length} תמונות):</h3>
                                 <div style={{ display: 'flex', gap: '10px' }}>
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
                     onClick={() => {
                       convertedImages.forEach((image, index) => {
                         const imageToSave = {
                           id: Date.now() + Math.random() + index,
                           name: image.filename,
                           url: image.dataUrl,
                           processedUrl: image.dataUrl,
                           source: 'format-converter-multiple-batch',
                           processed: true,
                           metadata: {
                             tool: 'המרת פורמט מרובה',
                             originalFormat: imageFile?.name?.split('.').pop() || 'unknown',
                             convertedFormat: outputFormat,
                             size: image.size,
                             processedAt: new Date().toISOString()
                           }
                         };
                         saveImageToLibrary(imageToSave);
                       });
                       setShowSuccessMessage(`נשמרו ${convertedImages.length} תמונות בספרייה`);
                       setTimeout(() => setShowSuccessMessage(''), 3000);
                     }}
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
              </div>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                gap: '15px' 
              }}>
                {convertedImages.map((image, index) => (
                  <div key={index} style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '10px',
                    background: '#fff',
                    textAlign: 'center'
                  }}>
                    <img 
                      src={image.dataUrl} 
                      alt={image.size}
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '150px', 
                        objectFit: 'contain',
                        marginBottom: '10px'
                      }} 
                    />
                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
                      {image.size}
                    </div>
                                         <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                       <button
                         onClick={() => downloadSingleImage(image)}
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
                         onClick={() => {
                           const imageToSave = {
                             id: Date.now() + Math.random(),
                             name: image.filename,
                             url: image.dataUrl,
                             processedUrl: image.dataUrl,
                             source: 'format-converter-multiple',
                             processed: true,
                             metadata: {
                               tool: 'המרת פורמט מרובה',
                               originalFormat: imageFile?.name?.split('.').pop() || 'unknown',
                               convertedFormat: outputFormat,
                               size: image.size,
                               processedAt: new Date().toISOString()
                             }
                           };
                           saveImageToLibrary(imageToSave);
                           setShowSuccessMessage('תמונה נשמרה בספרייה');
                           setTimeout(() => setShowSuccessMessage(''), 3000);
                         }}
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

          {convertedImage && (
            <div style={{ marginTop: '30px' }}>
              <h3>תוצאה (גודל מקורי):</h3>
              <img src={convertedImage} alt="תמונה מומרת" style={{ maxWidth: '100%' }} />
              
              {/* Transfer to other tools */}
              {availableTabs && availableTabs.length > 0 && (
                <div style={{
                  background: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '8px',
                  marginTop: '15px',
                  border: '1px solid #dee2e6'
                }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>🔄 העבר לכלי אחר:</h4>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        const imageToTransfer = {
                          id: Date.now() + Math.random(),
                          name: `converted.${outputFormat}`,
                          url: convertedImage,
                          processedUrl: convertedImage
                        };
                        transferToTab(e.target.value, [imageToTransfer]);
                        e.target.value = '';
                      }
                    }}
                    style={{
                      padding: '8px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '12px',
                      width: '200px'
                    }}
                  >
                    <option value="">בחר כלי...</option>
                    {availableTabs.map(tab => (
                      <option key={tab.id} value={tab.id}>
                        {tab.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
      
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
    </div>
  );
};

export default FormatConverter 
