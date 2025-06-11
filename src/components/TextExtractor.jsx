import React, { useState, useRef, useEffect } from 'react';
import { useImageLibrary } from './ImageLibrary';
import Tesseract from 'tesseract.js';

const TextExtractor = ({ transferToTab, pendingImageTransfer, availableTabs }) => {
  const { saveToLibrary: saveImageToLibrary, addImage } = useImageLibrary();

  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl] = useState('');
  const [extractedText, setExtractedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [language, setLanguage] = useState('heb');
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const fileInputRef = useRef(null);

  const languages = [
    { value: 'heb', label: 'עברית' },
    { value: 'heb+eng', label: 'עברית + אנגלית' },
    { value: 'eng', label: 'אנגלית' },
    { value: 'ara', label: 'ערבית' }
  ];

  useEffect(() => {
    const handleTransferImage = (event) => {
      const { imageData, targetTab } = event.detail;
      if (targetTab === 'ocr' && imageData) {
        handleDirectImageLoad(imageData);
      }
    };

    window.addEventListener('transferImage', handleTransferImage);
    return () => {
      window.removeEventListener('transferImage', handleTransferImage);
    };
  }, []);

  useEffect(() => {
    if (pendingImageTransfer) {
      handleDirectImageLoad(pendingImageTransfer);
    }
  }, [pendingImageTransfer]);

  const handleDirectImageLoad = (imageData) => {
    if (imageData.startsWith('data:')) {
      setImageUrl(imageData);
      setImageFile(null);
      setExtractedText('');
      setError('');
      setStatusMessage('');
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setImageFile(file);
      setImageUrl(url);
      setExtractedText('');
      setError('');
      setStatusMessage('');
      
      // שמירה אוטומטית בספריה
      addImage(url, {
        name: `${file.name} - זיהוי טקסט`,
        tool: 'ocr',
        timestamp: new Date(),
        originalName: file.name
      });
      
      // הודעה על שמירה
      setTimeout(() => {
        setStatusMessage('התמונה נשמרה בספריה אוטומטית ✅');
        setTimeout(() => setStatusMessage(''), 3000);
      }, 500);
    }
  };

  const extractText = async () => {
    if (!imageFile && !imageUrl) {
      setError('אנא בחר תמונה תחילה');
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setExtractedText('');
    setError('');
    setStatusMessage('מתחיל זיהוי טקסט...');

    try {
      setStatusMessage('מכין מנוע זיהוי...');
      
      const result = await Tesseract.recognize(
        imageFile || imageUrl,
        language,
        {
          logger: m => {
            console.log('OCR Progress:', m);
            
            if (m.status === 'recognizing text') {
              const progressValue = Math.round(m.progress * 100);
              setProgress(progressValue);
              setStatusMessage(`מזהה טקסט: ${progressValue}%`);
            } else if (m.status === 'loading language traineddata') {
              setStatusMessage(`טוען נתוני שפה...`);
            } else if (m.status === 'initializing tesseract') {
              setStatusMessage('מאתחל מנוע...');
            } else if (m.status === 'initialized tesseract') {
              setStatusMessage('מנוע מוכן');
            }
          }
        }
      );

      const { data: { text, confidence } } = result;
      
      const cleanedText = text
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/\s+$/gm, '')
        .trim();

      if (cleanedText && cleanedText.length > 0) {
        setExtractedText(cleanedText);
        setStatusMessage(`זיהוי הושלם! נמצאו ${cleanedText.length} תווים (ביטחון: ${Math.round(confidence)}%)`);
      } else {
        setError('לא נמצא טקסט בתמונה. נסה תמונה עם טקסט ברור יותר.');
      }
      
    } catch (error) {
      console.error('OCR Error:', error);
      setError(`שגיאה בזיהוי הטקסט: ${error.message || 'שגיאה לא ידועה'}`);
    } finally {
      setIsProcessing(false);
      setTimeout(() => {
        setProgress(0);
        if (!error) setStatusMessage('');
      }, 3000);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
      alert('הטקסט הועתק בהצלחה!');
    } catch (error) {
      console.error('Copy failed:', error);
      alert('שגיאה בהעתקת הטקסט');
    }
  };

  const saveAsTextFile = () => {
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted-text.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // שמירת התמונה המעובדת (עם טקסט זוהה) בספריה
  const saveProcessedToLibrary = () => {
    if (!imageUrl || !extractedText) return;
    
    addImage(imageUrl, {
      name: `טקסט זוהה - ${new Date().toLocaleDateString('he-IL')}`,
      tool: 'ocr-processed',
      timestamp: new Date(),
      extractedText: extractedText,
      language: language
    });
    
    alert('התמונה עם הטקסט שזוהה נשמרה בספריה!');
  };

  const clearAll = () => {
    setImageFile(null);
    setImageUrl('');
    setExtractedText('');
    setError('');
    setStatusMessage('');
    setProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="tool-container">
      {/* Header */}
      <div className="tool-header">
        <h2>🔍 זיהוי טקסט מתמונות</h2>
        <p>חלץ טקסט מתמונות בעברית ושפות נוספות</p>
        {(imageFile || imageUrl) && (
          <button 
            onClick={clearAll}
            disabled={isProcessing}
            style={{
              padding: '8px 16px',
              background: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              marginTop: '10px'
            }}
          >
            🗑️ תמונה חדשה
          </button>
        )}
      </div>

      {/* Auto-save notification */}
      {statusMessage && !isProcessing && statusMessage.includes('נשמרה בספריה') && (
        <div style={{
          background: '#d4edda',
          border: '1px solid #c3e6cb',
          color: '#155724',
          padding: '12px',
          borderRadius: '6px',
          marginBottom: '15px',
          fontSize: '14px'
        }}>
          {statusMessage}
        </div>
      )}

      {/* Upload Section */}
      <div className="upload-section">
        <div 
          className="upload-area"
          onClick={() => fileInputRef.current?.click()}
        >
          {imageUrl ? (
            <img src={imageUrl} alt="נבחר" className="preview-image" />
          ) : (
            <div className="upload-placeholder">
              <div className="upload-icon">📄</div>
              <p>לחץ לבחירת תמונה</p>
              <span>תומך ב-JPG, PNG, WebP</span>
              <small style={{ display: 'block', marginTop: '5px', color: '#6b7280' }}>
                התמונה תישמר אוטומטית בספריה
              </small>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="file-input"
          disabled={isProcessing}
        />
      </div>

      {/* Settings */}
      {imageUrl && (
        <div className="controls-section">
          <div className="method-selection">
            <h3>🌐 שפת הזיהוי:</h3>
            <div className="methods-grid">
              {languages.map(lang => (
                <button
                  key={lang.value}
                  className={`method-btn ${language === lang.value ? 'active' : ''}`}
                  onClick={() => setLanguage(lang.value)}
                  disabled={isProcessing}
                >
                  <span className="method-name">{lang.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button 
            className="process-btn"
            onClick={extractText}
            disabled={isProcessing}
          >
            {isProcessing ? `🔄 מזהה טקסט... ${progress}%` : '🔍 זהה טקסט'}
          </button>
        </div>
      )}

      {/* Progress */}
      {isProcessing && (
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{width: `${progress}%`}}></div>
          </div>
          <p>{statusMessage}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="error-message">
          <strong>שגיאה:</strong> {error}
        </div>
      )}

      {/* Results */}
      {extractedText && (
        <div className="result-section">
          <h3>✅ הטקסט שזוהה:</h3>
          <div className="text-result">
            <textarea
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              rows={8}
              placeholder="הטקסט שזוהה יופיע כאן..."
              style={{ 
                direction: language.includes('heb') || language.includes('ara') ? 'rtl' : 'ltr'
              }}
            />
          </div>
          
          <div className="result-actions">
            <div>
              <button className="download-btn" onClick={copyToClipboard}>
                📋 העתק טקסט
              </button>
              <button className="save-library-btn" onClick={saveAsTextFile}>
                💾 שמור כקובץ
              </button>
              <button 
                className="save-library-btn" 
                onClick={saveProcessedToLibrary}
                style={{ marginLeft: '10px' }}
              >
                📁 שמור מעובד בספריה
              </button>
            </div>
          </div>

          {/* Success message */}
          {statusMessage && !isProcessing && !statusMessage.includes('נשמרה בספריה') && (
            <div style={{
              background: '#d4edda',
              border: '1px solid #c3e6cb',
              color: '#155724',
              padding: '12px',
              borderRadius: '6px',
              marginTop: '15px',
              fontSize: '14px'
            }}>
              ✅ {statusMessage}
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      <div style={{
        background: '#e8f4fd',
        padding: '20px',
        borderRadius: '8px',
        marginTop: '20px'
      }}>
        <h4 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#1e40af' }}>
          💡 טיפים לזיהוי מוצלח:
        </h4>
        <ul style={{ 
          margin: 0, 
          paddingRight: '20px',
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#374151'
        }}>
          <li><strong>איכות:</strong> השתמש בתמונות ברזולוציה גבוהה</li>
          <li><strong>ניגודיות:</strong> טקסט כהה על רקע בהיר</li>
          <li><strong>זווית:</strong> צלם ישר מעל הטקסט</li>
          <li><strong>תאורה:</strong> ודא תאורה אחידה ללא צללים</li>
          <li><strong>שפה:</strong> בחר "עברית" בלבד לטקסט עברי טהור</li>
          <li><strong>ספריה:</strong> כל תמונה שתעלה תישמר אוטומטית בספריה</li>
        </ul>
      </div>

      {/* Transfer to other tools */}
      {imageUrl && availableTabs && (
        <div style={{
          background: '#f8f9fa',
          padding: '15px',
          borderRadius: '8px',
          marginTop: '15px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>
            🚀 המשך עיבוד - העבר ל:
          </h4>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {availableTabs.filter(tab => tab.id !== 'ocr').map(tab => (
              <button
                key={tab.id}
                onClick={() => transferToTab && transferToTab(tab.id, imageUrl)}
                style={{
                  padding: '6px 12px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {tab.name.he}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TextExtractor; 
