import React, { useState, useRef, useEffect } from "react";
import Cropper from "cropperjs";
import "cropperjs/dist/cropper.css";
import { useImageLibrary } from './ImageLibrary';
import "./ImageCropper.css";

const ImageCropper = ({ transferToTab, pendingImageTransfer, availableTabs }) => {
  const { addImage } = useImageLibrary();

  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [cropper, setCropper] = useState(null);
  const [aspectRatio, setAspectRatio] = useState("free");
  const [cropData, setCropData] = useState(null);
  const [croppedImage, setCroppedImage] = useState(null);
  const imageRef = useRef(null);
  const fileInputRef = useRef(null);

  // האזנה להעברת תמונות מספריית התמונות
  useEffect(() => {
    const handleTransferImage = (event) => {
      if (event.detail && event.detail.targetTab === 'crop') {
        const imageData = event.detail.imageData;
        const imageUrl = imageData.processedUrl || imageData.url || imageData.data;
        setImageUrl(imageUrl);
        setImageFile({ name: imageData.name || 'transferred-image.png' });
        setCroppedImage(null);
      }
    };

    const handleDirectTransfer = (event) => {
      if (event.detail && event.detail.imageData) {
        const imageData = event.detail.imageData;
        const imageUrl = imageData.processedUrl || imageData.url || imageData.data;
        setImageUrl(imageUrl);
        setImageFile({ name: imageData.name || 'transferred-image.png' });
        setCroppedImage(null);
      }
    };

    window.addEventListener('transferImage', handleTransferImage);
    window.addEventListener('transferImageToCropper', handleDirectTransfer);
    return () => {
      window.removeEventListener('transferImage', handleTransferImage);
      window.removeEventListener('transferImageToCropper', handleDirectTransfer);
    };
  }, []);

  const aspectRatios = {
    free: { value: null, label: "חופשי" },
    square: { value: 1, label: "מרבע (1:1)" },
    portrait: { value: 3/4, label: "דיוקן (3:4)" },
    landscape: { value: 4/3, label: "נוף (4:3)" },
    widescreen: { value: 16/9, label: "מסך רחב (16:9)" },
    classic: { value: 5/4, label: "קלאסי (5:4)" },
    cinema: { value: 21/9, label: "קולנוע (21:9)" }
  };

  useEffect(() => {
    if (imageUrl && imageRef.current) {
      const newCropper = new Cropper(imageRef.current, {
        aspectRatio: aspectRatios[aspectRatio].value,
        viewMode: 1,
        dragMode: 'move',
        autoCropArea: 0.8,
        responsive: true,
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        ready() {
          setCropData(this.cropper.getData(true));
        },
        crop(event) {
          setCropData(event.detail);
        }
      });
      setCropper(newCropper);
      
      return () => {
        newCropper.destroy();
      };
    }
  }, [imageUrl, aspectRatio]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setCroppedImage(null);
      
      // שמירה אוטומטית לספרייה
      addImage(url, {
        name: file.name,
        tool: 'image-cropper-upload',
        timestamp: new Date(),
        isOriginal: true
      });
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.currentTarget.classList.add('dragover');
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      const file = files[0];
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setCroppedImage(null);
      
      // שמירה אוטומטית לספרייה
      addImage(url, {
        name: file.name,
        tool: 'image-cropper-upload',
        timestamp: new Date(),
        isOriginal: true
      });
    }
  };

  const handleAspectRatioChange = (ratio) => {
    setAspectRatio(ratio);
    if (cropper) {
      cropper.setAspectRatio(aspectRatios[ratio].value);
    }
  };

  const cropImage = () => {
    if (cropper) {
      const canvas = cropper.getCroppedCanvas({
        maxWidth: 4096,
        maxHeight: 4096,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });
      
      if (canvas) {
        setCroppedImage(canvas.toDataURL('image/png'));
      }
    }
  };

  const downloadImage = () => {
    if (croppedImage) {
      const link = document.createElement('a');
      link.href = croppedImage;
      link.download = `cropped-${imageFile.name.split('.')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const resetCropper = () => {
    if (cropper) {
      cropper.reset();
    }
  };

  const resetAll = () => {
    if (cropper) {
      cropper.destroy();
    }
    setCropper(null);
    setImageFile(null);
    setImageUrl("");
    setCropData(null);
    setCroppedImage(null);
    setAspectRatio("free");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Save to library
  const saveToLibrary = () => {
    if (!croppedImage) return;
    
    addImage(croppedImage, {
      name: `חיתוך תמונה - ${new Date().toLocaleDateString('he-IL')}`,
      tool: 'image-cropper',
      originalName: `cropped-${imageFile?.name || 'image'}.png`,
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
        setImageUrl(firstImage.url || firstImage.processedUrl);
        setImageFile({ name: firstImage.name || 'transferred-image.png' });
        setCroppedImage(null);
      }
    }
  }, [pendingImageTransfer]);

  return (
    <div className="image-cropper">
      <div className="cropper-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 style={{ margin: 0 }}>✂️ חיתוך תמונות מתקדם</h2>
          {imageUrl && (
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
        <p>חתכו תמונות ביחסי גובה-רוחב שונים עם כלי מקצועי</p>
      </div>

      {!imageUrl ? (
        <div
          className="upload-area"
          onClick={() => fileInputRef.current.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="upload-icon">📁</div>
          <div className="upload-text">גררו תמונה או לחצו לבחירה</div>
          <div className="upload-hint">תומך ב-JPG, PNG, GIF, WebP</div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
        </div>
      ) : (
        <div className="cropper-workspace">
          <div className="image-container">
            <img
              ref={imageRef}
              src={imageUrl}
              alt="תמונה לחיתוך"
              style={{ maxWidth: '100%' }}
            />
          </div>

          <div className="controls-panel">
            <div className="control-group">
              <label>יחס גובה-רוחב</label>
              <div className="aspect-ratios">
                {Object.entries(aspectRatios).map(([key, ratio]) => (
                  <button
                    key={key}
                    className={`aspect-ratio-btn ${aspectRatio === key ? 'active' : ''}`}
                    onClick={() => handleAspectRatioChange(key)}
                  >
                    {ratio.label}
                  </button>
                ))}
              </div>
            </div>

            {cropData && (
              <div className="crop-info">
                <h4>פרטי החיתוך</h4>
                <p>רוחב: {Math.round(cropData.width)} פיקסלים</p>
                <p>גובה: {Math.round(cropData.height)} פיקסלים</p>
                <p>X: {Math.round(cropData.x)}</p>
                <p>Y: {Math.round(cropData.y)}</p>
                <p>זום: {Math.round((cropData.scaleX || 1) * 100)}%</p>
              </div>
            )}

            <div className="action-buttons">
              <button className="btn btn-primary" onClick={cropImage}>
                ✂️ חתוך תמונה
              </button>
              <button className="btn btn-secondary" onClick={resetCropper}>
                🔄 איפוס
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => fileInputRef.current.click()}
              >
                📁 תמונה חדשה
              </button>
            </div>
          </div>
        </div>
      )}

      {croppedImage && (
        <div className="result-section">
          <h3>תוצאת החיתוך</h3>
          <img src={croppedImage} alt="תמונה חתוכה" className="cropped-result" />
          
          {/* Library and transfer actions */}
          <div style={{
            background: '#f8f9fa',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '15px',
            border: '1px solid #dee2e6'
          }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>📚 פעולות ספרייה:</h4>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={saveToLibrary}
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
                💾 שמור בספרייה
              </button>
              {availableTabs && availableTabs.length > 0 && (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      const imageToTransfer = {
                        id: Date.now() + Math.random(),
                        name: `cropped-${imageFile?.name || 'image'}.png`,
                        url: croppedImage,
                        processedUrl: croppedImage
                      };
                      transferToTab(e.target.value, [imageToTransfer]);
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
          
          <div className="action-buttons">
            <button className="btn btn-primary" onClick={downloadImage}>
              💾 הורדת תמונה
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default ImageCropper; 
