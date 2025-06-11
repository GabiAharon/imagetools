import React, { useState, useRef, useEffect } from "react";
import { useImageLibrary } from './ImageLibrary';

const FormatConverter = ({ transferToTab, pendingImageTransfer, availableTabs }) => {
  const { saveToLibrary: saveImageToLibrary } = useImageLibrary();

  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [outputFormat, setOutputFormat] = useState("png");
  const [quality, setQuality] = useState(0.9);
  const [convertedImage, setConvertedImage] = useState(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const formats = [
    { value: "png", label: "PNG (ללא דחיסה)" },
    { value: "jpeg", label: "JPEG (דחיסה)" },
    { value: "webp", label: "WebP (מתקדם)" },
    { value: "bmp", label: "BMP (בסיסי)" }
  ];

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setConvertedImage(null);
      
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
      <p>המר תמונות בין פורמטים שונים</p>

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
          <div style={{ fontSize: '14px', color: '#666' }}>
            תומך ב-JPG, PNG, GIF, WebP, BMP
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

          <div style={{ marginBottom: '20px' }}>
            <button 
              onClick={convertFormat}
              style={{
                background: 'linear-gradient(135deg, #007bff, #0056b3)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              🔄 המר פורמט
            </button>
            
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

          {convertedImage && (
            <div>
              <h3>תוצאה:</h3>
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
