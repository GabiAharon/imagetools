import React, { useState } from 'react';
import QRCode from 'qrcode';
import { useImageLibrary } from './ImageLibrary';

const QRCodeTool = ({ transferToTab, availableTabs }) => {
  const { saveToLibrary: saveImageToLibrary } = useImageLibrary();

  const [text, setText] = useState('');
  const [qrDataURL, setQrDataURL] = useState('');
  const [loading, setLoading] = useState(false);

  // Generate QR Code
  const generateQR = async () => {
    if (!text.trim()) {
      alert('אנא הכנס טקסט');
      return;
    }
    
    setLoading(true);
    try {
      const url = await QRCode.toDataURL(text, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });
      setQrDataURL(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('שגיאה ביצירת קוד QR');
    }
    setLoading(false);
  };

  // Download QR Code
  const downloadQR = () => {
    if (!qrDataURL) return;
    
    const link = document.createElement('a');
    link.href = qrDataURL;
    link.download = `qr-code-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset function
  const resetTool = () => {
    setText('');
    setQrDataURL('');
    setLoading(false);
  };

  // Save to library
  const saveToLibrary = () => {
    if (qrDataURL) {
      const imageToSave = {
        id: Date.now() + Math.random(),
        name: `qr-code-${Date.now()}.png`,
        url: qrDataURL,
        processedUrl: qrDataURL,
        source: 'qr-code-tool',
        processed: true,
        metadata: {
          tool: 'QR & ברקוד',
          qrText: text,
          type: 'qr-code',
          createdAt: new Date().toISOString()
        }
      };

      saveImageToLibrary(imageToSave);
    }
  };

  // Preset options
  const presets = [
    { label: 'אתר אינטרנט', value: 'https://' },
    { label: 'אימייל', value: 'mailto:' },
    { label: 'טלפון', value: 'tel:' },
    { label: 'SMS', value: 'sms:' }
  ];

  return (
    <div style={{ 
      padding: '20px', 
      background: 'white', 
      borderRadius: '12px', 
      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
      textAlign: 'center',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>📱 QR & ברקוד</h2>
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
      
      <p style={{ color: '#7f8c8d', marginBottom: '20px' }}>יצירה וסריקה של קודי QR</p>
      
      {/* Presets */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>תבניות מהירות:</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {presets.map((preset, index) => (
            <button
              key={index}
              onClick={() => setText(preset.value)}
              style={{
                padding: '6px 12px',
                background: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ margin: '20px 0' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="הכנס טקסט או URL..."
          rows={3}
          style={{
            padding: '10px',
            width: '100%',
            maxWidth: '400px',
            border: '2px solid #e9ecef',
            borderRadius: '8px',
            fontSize: '16px',
            resize: 'vertical',
            fontFamily: 'inherit'
          }}
        />
      </div>
      
      <button 
        style={{
          padding: '12px 24px',
          background: loading ? '#95a5a6' : '#3498db',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          marginBottom: '20px'
        }}
        onClick={generateQR}
        disabled={loading}
      >
        {loading ? '⏳ יוצר...' : '🔲 צור QR קוד'}
      </button>

      {qrDataURL && (
        <div style={{
          background: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginTop: '20px'
        }}>
          <h3 style={{ marginBottom: '15px' }}>קוד QR שנוצר:</h3>
          <img 
            src={qrDataURL} 
            alt="Generated QR Code" 
            style={{
              maxWidth: '200px',
              border: '2px solid #dee2e6',
              borderRadius: '8px',
              marginBottom: '15px'
            }}
          />
          <br />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={downloadQR}
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
              💾 הורד תמונה
            </button>
            
            <button 
              onClick={saveToLibrary}
              style={{
                padding: '10px 20px',
                background: '#17a2b8',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📚 שמור בספרייה
            </button>
          </div>
          
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
                      name: `qr-code-${Date.now()}.png`,
                      url: qrDataURL,
                      processedUrl: qrDataURL
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
  );
};

export default QRCodeTool; 
