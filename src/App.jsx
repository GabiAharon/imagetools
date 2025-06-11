import React, { useState, useEffect } from 'react'
import ImageResizer from './components/ImageResizer'
import BackgroundRemover from './components/BackgroundRemover'
import ImageCropper from './components/ImageCropper'
import FormatConverter from './components/FormatConverter'
import TextExtractor from './components/TextExtractor'
import QRCodeTool from './components/QRCodeTool'
import Watermark from './components/Watermark'
import ImageLibrary, { ImageLibraryProvider, useImageLibrary } from './components/ImageLibrary'
import defaultLayout from './config/default-layout.json'
import './App.css'

// Hook לשימוש בשפה - מועבר מחוץ לקומפוננט הראשי
export const useLanguage = () => {
  // This will be populated by the main App component
  return { language: 'he' };
};

function App() {
  const [activeTab, setActiveTab] = useState('background')
  const [language, setLanguage] = useState('he')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
  // Edit mode states
  const [isEditMode, setIsEditMode] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [keySequence, setKeySequence] = useState([])
  const [draggedTabIndex, setDraggedTabIndex] = useState(null)

  // Protected password - stored in a way that won't appear directly in GitHub
  const getSecretPassword = () => {
    const parts = ['gabi', '2024'];
    return parts.join('');
  };

  // Load saved layout from localStorage
  const loadSavedLayout = () => {
    try {
      const saved = localStorage.getItem('designStudio_layout');
      console.log('Raw saved data:', saved);
      const parsed = saved ? JSON.parse(saved) : null;
      console.log('Parsed data:', parsed);
      return parsed;
    } catch (error) {
      console.error('Error loading layout:', error);
      return null;
    }
  };

  // Save layout to localStorage
  const saveLayout = (layout) => {
    try {
      const dataToSave = {
        ...layout,
        version: defaultLayout.version,
        lastModified: new Date().toISOString(),
        userCustomized: true
      };
      
      const stringifiedData = JSON.stringify(dataToSave);
      console.log('Saving layout data:', stringifiedData);
      localStorage.setItem('designStudio_layout', stringifiedData);
      
      // Verify save was successful
      const verification = localStorage.getItem('designStudio_layout');
      console.log('Verification - data saved:', verification);
      
      // Future: This is where we'll add server sync
      // syncToServer(dataToSave);
      
      return true;
    } catch (error) {
      console.error('Could not save layout:', error);
      return false;
    }
  };

  // Base tabs definition
  const baseTabs = [
    {
      id: 'background',
      name: { he: 'הסרת רקע', en: 'Background Remover' },
      description: { he: 'הסר רקע מתמונות', en: 'Remove background from images' },
      component: BackgroundRemover
    },
    {
      id: 'crop',
      name: { he: 'חיתוך תמונה', en: 'Image Cropper' },
      description: { he: 'חתוך וערוך תמונות', en: 'Crop and edit images' },
      component: ImageCropper
    },
    {
      id: 'resize',
      name: { he: 'שינוי גודל', en: 'Image Resizer' },
      description: { he: 'שנה גודל תמונות', en: 'Resize images' },
      component: ImageResizer
    },
    {
      id: 'format',
      name: { he: 'המרת פורמט', en: 'Format Converter' },
      description: { he: 'המר פורמטי תמונות', en: 'Convert image formats' },
      component: FormatConverter
    },
    {
      id: 'ocr',
      name: { he: 'חילוץ טקסט', en: 'Text Extractor' },
      description: { he: 'חלץ טקסט מתמונות', en: 'Extract text from images' },
      component: TextExtractor
    },
    {
      id: 'watermark',
      name: { he: 'סימן מים', en: 'Watermark' },
      description: { he: 'הוסף סימן מים לתמונות', en: 'Add watermark to images' },
      component: Watermark
    },
    {
      id: 'qr',
      name: { he: 'יצירת ברקוד', en: 'QR Code Generator' },
      description: { he: 'צור ברקודים', en: 'Generate QR codes' },
      component: QRCodeTool
    }
  ];

  // Load custom order or use default
  const [tabOrder, setTabOrder] = useState(() => {
    const saved = loadSavedLayout();
    return saved?.tabOrder || defaultLayout.tabOrder;
  });

  // Navigation elements order
  const [navElementsOrder, setNavElementsOrder] = useState(() => {
    const saved = loadSavedLayout();
    return saved?.navElementsOrder || defaultLayout.navElementsOrder;
  });

  // Apply custom order to tabs with language direction
  const getOrderedTabs = () => {
    const orderedTabs = tabOrder.map(id => baseTabs.find(tab => tab.id === id)).filter(Boolean);
    // Add any new tabs that might not be in saved order
    const missingTabs = baseTabs.filter(tab => !tabOrder.includes(tab.id));
    const allTabs = [...orderedTabs, ...missingTabs];
    
    // Reverse order for Hebrew (RTL) so background is on the right and QR on the left
    return language === 'he' ? [...allTabs].reverse() : allTabs;
  };

  const tabs = getOrderedTabs();

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || BackgroundRemover

  // Load saved layout on mount and when needed
  useEffect(() => {
    console.log('Loading saved layout...');
    const saved = loadSavedLayout();
    console.log('Loaded layout:', saved);
    
    if (saved) {
      if (saved.tabOrder && saved.tabOrder !== tabOrder) {
        console.log('Setting tab order:', saved.tabOrder);
        setTabOrder(saved.tabOrder);
      }
      if (saved.navElementsOrder && saved.navElementsOrder !== navElementsOrder) {
        console.log('Setting nav elements order:', saved.navElementsOrder);
        setNavElementsOrder(saved.navElementsOrder);
      }
    }
  }, []);

  // Save layout whenever it changes
  useEffect(() => {
    const layoutToSave = { 
      tabOrder: tabOrder,
      navElementsOrder: navElementsOrder 
    };
    console.log('Saving layout:', layoutToSave);
    saveLayout(layoutToSave);
  }, [tabOrder, navElementsOrder]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Track key sequence for Ctrl+Shift+A
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setShowPasswordDialog(true);
      }
      
      // Exit edit mode with Escape
      if (e.key === 'Escape' && isEditMode) {
        setIsEditMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode]);

  // Handle password verification
  const handlePasswordSubmit = () => {
    if (passwordInput === getSecretPassword()) {
      setIsEditMode(true);
      setShowPasswordDialog(false);
      setPasswordInput('');
    } else {
      alert(language === 'he' ? 'סיסמה שגויה' : 'Wrong password');
      setPasswordInput('');
    }
  };

  // Handle tab reordering in edit mode
  const moveTab = (fromIndex, toIndex) => {
    if (!isEditMode) return;
    
    console.log(`Moving tab from ${fromIndex} to ${toIndex}`);
    const currentTabs = getOrderedTabs();
    console.log('Current tabs before move:', currentTabs.map(t => t.id));
    
    // Work with the base order (not language-reversed)
    const baseOrderedTabs = tabOrder.map(id => baseTabs.find(tab => tab.id === id)).filter(Boolean);
    const missingTabs = baseTabs.filter(tab => !tabOrder.includes(tab.id));
    const allBaseTabs = [...baseOrderedTabs, ...missingTabs];
    
    const newOrder = [...allBaseTabs];
    const [movedTab] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedTab);
    
    const newTabOrder = newOrder.map(tab => tab.id);
    console.log('New tab order:', newTabOrder);
    
    setTabOrder(newTabOrder);
  };

  // Handle navigation elements reordering
  const moveNavElement = (fromIndex, toIndex) => {
    if (!isEditMode) return;
    
    console.log(`Moving nav element from ${fromIndex} to ${toIndex}`);
    console.log('Current nav order:', navElementsOrder);
    
    const newOrder = [...navElementsOrder];
    const [movedElement] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedElement);
    
    console.log('New nav order:', newOrder);
    setNavElementsOrder(newOrder);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'he' ? 'en' : 'he')
  }

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  // פונקציה לחזרה למסך הראשי
  const returnToHome = () => {
    setActiveTab('background')
  }

  const handleTransferToTab = (tabId, imageData) => {
    // Change to the target tab
    setActiveTab(tabId);
    
    // Add a small delay to ensure the component is mounted
    setTimeout(() => {
      // Trigger a custom event that components can listen to
      window.dispatchEvent(new CustomEvent('transferImage', {
        detail: { imageData, targetTab: tabId }
      }));
    }, 500);
  };

  // Handle direct drop from library to active tab
  const handleDirectDropToActiveTab = (imageData) => {
    // Send direct transfer to current active tab without changing tabs
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('transferImage', {
        detail: { imageData, targetTab: activeTab }
      }));
    }, 100);
  };

  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr'
    
    // Apply dark mode to document
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }

    // Listen for direct drops from library
    const handleLibraryDrop = (event) => {
      const { imageData } = event.detail;
      if (imageData) {
        handleDirectDropToActiveTab(imageData);
      }
    };

    window.addEventListener('directDropToActiveTab', handleLibraryDrop);
    return () => window.removeEventListener('directDropToActiveTab', handleLibraryDrop);
  }, [language, isDarkMode, activeTab])

  // Reset to default layout
  const resetToDefault = () => {
    console.log('Resetting to default layout');
    setTabOrder(defaultLayout.tabOrder);
    setNavElementsOrder(defaultLayout.navElementsOrder);
    
    // Clear localStorage
    localStorage.removeItem('designStudio_layout');
    
    alert(language === 'he' ? 'הפריסה אופסה למצב ברירת המחדל' : 'Layout reset to default');
  };

  return (
    <ImageLibraryProvider>
      <div className={`app ${language} ${isDarkMode ? 'dark-mode' : ''} ${isEditMode ? 'edit-mode' : ''}`}>
        {/* Password Dialog */}
        {showPasswordDialog && (
          <div className="password-overlay">
            <div className="password-dialog">
              <h3>{language === 'he' ? 'מצב עריכה מתקדם' : 'Advanced Edit Mode'}</h3>
              <p className="password-description">
                {language === 'he' 
                  ? 'במצב זה תוכל לגרור ולסדר מחדש את כל האלמנטים בתפריט העליון'
                  : 'In this mode you can drag and reorder all navigation elements'
                }
              </p>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                placeholder={language === 'he' ? 'הזן סיסמה...' : 'Enter password...'}
                autoFocus
              />
              <div className="password-actions">
                <button onClick={handlePasswordSubmit} className="password-ok">
                  {language === 'he' ? 'אישור' : 'OK'}
                </button>
                <button onClick={() => {
                  setShowPasswordDialog(false);
                  setPasswordInput('');
                }} className="password-cancel">
                  {language === 'he' ? 'ביטול' : 'Cancel'}
                </button>
              </div>
              <div className="password-hint">
                {language === 'he' ? 'קיצור: Ctrl+Shift+A' : 'Shortcut: Ctrl+Shift+A'}
              </div>
            </div>
          </div>
        )}

        {/* Edit Mode Indicator */}
        {isEditMode && (
          <div className="edit-mode-indicator">
            <span>{language === 'he' ? 'מצב עריכה פעיל - גרור כדי לשנות סדר' : 'Edit Mode Active - Drag to reorder'}</span>
            <div className="edit-mode-actions">
              <button onClick={resetToDefault} className="reset-button">
                {language === 'he' ? 'איפוס' : 'Reset'}
              </button>
              <button onClick={() => setIsEditMode(false)}>
                {language === 'he' ? 'סיום עריכה' : 'Exit Edit'}
              </button>
            </div>
          </div>
        )}

        {/* Top Navigation */}
        <div className="top-navigation">
          <div className="nav-container">
            {navElementsOrder.map((elementType, elementIndex) => {
              if (elementType === 'logo') {
                return (
                  <div 
                    key="logo"
                    className={`nav-element nav-brand ${isEditMode ? 'draggable-element' : ''}`}
                    draggable={isEditMode}
                    onDragStart={(e) => {
                      if (isEditMode) {
                        e.dataTransfer.setData('text/plain', elementIndex.toString());
                        e.dataTransfer.effectAllowed = 'move';
                      }
                    }}
                    onDragOver={(e) => {
                      if (isEditMode) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }
                    }}
                    onDragEnter={(e) => {
                      if (isEditMode) {
                        e.preventDefault();
                        e.currentTarget.classList.add('drag-over');
                      }
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('drag-over');
                    }}
                    onDrop={(e) => {
                      if (isEditMode) {
                        e.preventDefault();
                        e.currentTarget.classList.remove('drag-over');
                        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                        if (fromIndex !== elementIndex) {
                          moveNavElement(fromIndex, elementIndex);
                        }
                      }
                    }}
                  >
                    <div className="brand-logo" onClick={returnToHome} style={{ cursor: 'pointer' }}>
                      <img 
                        src="https://i.postimg.cc/T3SxsQrn/no-bg-1749543283927.png" 
                        alt="GA Logo" 
                        className="brand-image custom-logo"
                        onError={(e) => {
                          console.error('Custom logo failed to load:', e);
                          console.log('Switching to fallback logo');
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                        onLoad={(e) => {
                          console.log('Custom logo loaded successfully');
                          e.target.style.display = 'block';
                          e.target.nextElementSibling.style.display = 'none';
                        }}
                        crossOrigin="anonymous"
                      />
                      <div className="ga-logo-fallback" style={{ display: 'none' }}>
                        <span className="ga-text">GA</span>
                      </div>
                      <span className="brand-name">Design Studio</span>
                    </div>
                    {isEditMode && <div className="element-drag-handle">⋮⋮</div>}
                  </div>
                );
              }

              if (elementType === 'tabs') {
                return (
                  <div 
                    key="tabs"
                    className={`nav-element nav-tabs-container ${isEditMode ? 'draggable-element' : ''}`}
                    draggable={isEditMode}
                    onDragStart={(e) => {
                      if (isEditMode) {
                        e.dataTransfer.setData('text/plain', elementIndex.toString());
                        e.dataTransfer.effectAllowed = 'move';
                      }
                    }}
                    onDragOver={(e) => {
                      if (isEditMode) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }
                    }}
                    onDragEnter={(e) => {
                      if (isEditMode) {
                        e.preventDefault();
                        e.currentTarget.classList.add('drag-over');
                      }
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('drag-over');
                    }}
                    onDrop={(e) => {
                      if (isEditMode) {
                        e.preventDefault();
                        e.currentTarget.classList.remove('drag-over');
                        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                        if (fromIndex !== elementIndex) {
                          moveNavElement(fromIndex, elementIndex);
                        }
                      }
                    }}
                  >
                    <div className="nav-tabs">
                      {tabs.map((tab, index) => (
                        <button
                          key={tab.id}
                          className={`nav-tab ${activeTab === tab.id ? 'active' : ''} ${isEditMode ? 'editable' : ''} ${draggedTabIndex === index ? 'dragging' : ''}`}
                          onClick={() => setActiveTab(tab.id)}
                          title={tab.description[language]}
                          draggable={isEditMode}
                          onDragStart={(e) => {
                            if (isEditMode) {
                              setDraggedTabIndex(index);
                              e.dataTransfer.setData('application/x-tab-index', index.toString());
                              e.stopPropagation();
                            }
                          }}
                          onDragEnd={() => {
                            setDraggedTabIndex(null);
                          }}
                          onDragOver={(e) => {
                            if (isEditMode && draggedTabIndex !== null && draggedTabIndex !== index) {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              e.stopPropagation();
                            }
                          }}
                          onDragEnter={(e) => {
                            if (isEditMode && draggedTabIndex !== null && draggedTabIndex !== index) {
                              e.preventDefault();
                              e.currentTarget.classList.add('tab-drag-over');
                              e.stopPropagation();
                            }
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.classList.remove('tab-drag-over');
                          }}
                          onDrop={(e) => {
                            if (isEditMode) {
                              e.preventDefault();
                              e.currentTarget.classList.remove('tab-drag-over');
                              const fromIndex = parseInt(e.dataTransfer.getData('application/x-tab-index'));
                              if (fromIndex !== index && !isNaN(fromIndex)) {
                                moveTab(fromIndex, index);
                              }
                              e.stopPropagation();
                            }
                          }}
                        >
                          {tab.id === 'background' && (
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M20 4h-8l-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5.99 4c.67 0 1.23.33 1.58.84L16.84 11H13.5c-.28 0-.5-.22-.5-.5s.22-.5.5-.5h1.34l-.83-1.34c-.1-.16-.28-.16-.38 0L12.49 10.5c-.28 0-.5.22-.5.5s.22.5.5.5h1.34l-.84 1.34c-.1.16-.28.16-.38 0L11.46 11h-3.34l1.25 2.16c.35.51.91.84 1.58.84s1.23-.33 1.58-.84L13.78 11H16.22l1.25 2.16c.35.51.91.84 1.58.84z"/>
                            </svg>
                          )}
                          {tab.id === 'crop' && (
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17,15H19V17H17V19H15V17H9C7.9,17 7,16.1 7,15V9H5V7H7V5H9V7H15C16.1,7 17,7.9 17,9V15M15,9H9V15H15V9Z"/>
                            </svg>
                          )}
                          {tab.id === 'resize' && (
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M22,18V22H18V20H20V18H22M22,6V10H20V8H18V6H22M2,6V10H4V8H6V6H2M2,18V22H6V20H4V18H2M16,2V4H18V2H16M16,20V22H18V20H16M8,2V4H10V2H8M8,20V22H10V20H8M12,2V4H14V2H12M12,20V22H14V20H12"/>
                            </svg>
                          )}
                          {tab.id === 'format' && (
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12,6V9L16,5L12,1V4A8,8 0 0,0 4,12C4,13.57 4.46,15.03 5.24,16.26L6.7,14.8C6.25,13.97 6,13 6,12A6,6 0 0,1 12,6M18.76,7.74L17.3,9.2C17.74,10.04 18,11 18,12A6,6 0 0,1 12,18V15L8,19L12,23V20A8,8 0 0,0 20,12C20,10.43 19.54,8.97 18.76,7.74Z"/>
                            </svg>
                          )}
                          {tab.id === 'ocr' && (
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17,7H22V17H17V19A1,1 0 0,0 18,20H20V22H17.5C16.95,22 16,21.55 16,21C16,21.55 15.05,22 14.5,22H12V20H14A1,1 0 0,0 15,19V5A1,1 0 0,0 14,4H12V2H14.5C15.05,2 16,2.45 16,3C16,2.45 16.95,2 17.5,2H20V4H18A1,1 0 0,0 17,5V7M2,7H13V9H4V15H13V17H2V7M8,10V14H11V12H9V10H8Z"/>
                            </svg>
                          )}
                          {tab.id === 'watermark' && (
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M5,3C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H5M5,5H19V19H5V5M7,7V9H17V7H7M7,11V13H17V11H7M7,15V17H14V15H7Z"/>
                            </svg>
                          )}
                          {tab.id === 'qr' && (
                            <svg viewBox="0 0 24 24" fill="currentColor">
                              <path d="M3,11H5V13H3V11M11,5H13V9H11V5M9,11H13V15H9V11M15,11H17V13H15V11M19,11H21V13H19V11M12,15H14V17H12V15M3,5H9V9H3V5M5,7V7H7V7H5M3,15H9V19H3V15M5,17V17H7V17H5M15,5H21V9H15V5M17,7V7H19V7H17M15,15H17V17H15V15M17,17H19V19H17V17M19,17H21V19H19V17M17,15H21V17H17V15M3,21H5V23H3V21M7,21H9V23H7V21M11,21H13V23H11V21M15,21H17V23H15V21M19,21H21V23H19V21"/>
                            </svg>
                          )}
                          <span>{tab.name[language]}</span>
                          {isEditMode && (
                            <div className="drag-handle">⋮⋮</div>
                          )}
                        </button>
                      ))}
                    </div>
                    {isEditMode && <div className="element-drag-handle">⋮⋮</div>}
                  </div>
                );
              }

              if (elementType === 'controls') {
                return (
                  <div 
                    key="controls"
                    className={`nav-element nav-controls ${isEditMode ? 'draggable-element' : ''}`}
                    draggable={isEditMode}
                    onDragStart={(e) => {
                      if (isEditMode) {
                        e.dataTransfer.setData('text/plain', elementIndex.toString());
                        e.dataTransfer.effectAllowed = 'move';
                      }
                    }}
                    onDragOver={(e) => {
                      if (isEditMode) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }
                    }}
                    onDragEnter={(e) => {
                      if (isEditMode) {
                        e.preventDefault();
                        e.currentTarget.classList.add('drag-over');
                      }
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('drag-over');
                    }}
                    onDrop={(e) => {
                      if (isEditMode) {
                        e.preventDefault();
                        e.currentTarget.classList.remove('drag-over');
                        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                        if (fromIndex !== elementIndex) {
                          moveNavElement(fromIndex, elementIndex);
                        }
                      }
                    }}
                  >
                    <button className="dark-mode-toggle" onClick={toggleDarkMode} title={isDarkMode ? (language === 'he' ? 'מצב יום' : 'Light Mode') : (language === 'he' ? 'מצב לילה' : 'Dark Mode')}>
                      {isDarkMode ? (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12,7A5,5 0 0,1 17,12A5,5 0 0,1 12,17A5,5 0 0,1 7,12A5,5 0 0,1 12,7M12,9A3,3 0 0,0 9,12A3,3 0 0,0 12,15A3,3 0 0,0 15,12A3,3 0 0,0 12,9M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.21C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.4 6.35,17.41C9.37,20.43 14,20.54 17.33,17.97Z"/>
                        </svg>
                      )}
                    </button>

                    <button className="language-toggle" onClick={toggleLanguage}>
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
                      </svg>
                      {language === 'he' ? 'EN' : 'עב'}
                    </button>
                    {isEditMode && <div className="element-drag-handle">⋮⋮</div>}
                  </div>
                );
              }

              if (elementType === 'profile') {
                return (
                  <div 
                    key="profile"
                    className={`nav-element profile-section ${isEditMode ? 'draggable-element' : ''}`}
                    draggable={isEditMode}
                    onDragStart={(e) => {
                      if (isEditMode) {
                        e.dataTransfer.setData('text/plain', elementIndex.toString());
                        e.dataTransfer.effectAllowed = 'move';
                      }
                    }}
                    onDragOver={(e) => {
                      if (isEditMode) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }
                    }}
                    onDragEnter={(e) => {
                      if (isEditMode) {
                        e.preventDefault();
                        e.currentTarget.classList.add('drag-over');
                      }
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('drag-over');
                    }}
                    onDrop={(e) => {
                      if (isEditMode) {
                        e.preventDefault();
                        e.currentTarget.classList.remove('drag-over');
                        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                        if (fromIndex !== elementIndex) {
                          moveNavElement(fromIndex, elementIndex);
                        }
                      }
                    }}
                  >
                    <a href="https://www.gabiaharon.com" target="_blank" rel="noopener noreferrer">
                      <img 
                        src="https://i.postimg.cc/L4N7Mj6X/Untitled-design-1.png" 
                        alt="Profile" 
                        className="profile-image"
                        onError={(e) => {
                          if (e.target.src.includes('postimg.cc')) {
                            e.target.src = "https://via.placeholder.com/40x40/3b82f6/ffffff?text=G";
                          } else {
                            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Ccircle cx='20' cy='20' r='20' fill='%233b82f6'/%3E%3Ctext x='20' y='26' text-anchor='middle' fill='white' font-size='16' font-weight='bold'%3EG%3C/text%3E%3C/svg%3E";
                          }
                        }}
                        crossOrigin="anonymous"
                      />
                    </a>
                    {isEditMode && <div className="element-drag-handle">⋮⋮</div>}
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>

        {/* Main App Body */}
        <div className="app-body">
          <main className={`main-content ${isDragging ? 'drag-over' : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  // Check if it's a library image being dragged
                  try {
                    const libraryImageData = e.dataTransfer.getData('application/json');
                    if (libraryImageData) {
                      const libraryImage = JSON.parse(libraryImageData);
                      handleDirectDropToActiveTab(libraryImage);
                    }
                  } catch (error) {
                    // Not library data
                  }
                }}>
            <div className="tool-header">
              <h2>{tabs.find(tab => tab.id === activeTab)?.name[language]}</h2>
              <p>{tabs.find(tab => tab.id === activeTab)?.description[language]}</p>
            </div>
            
            <ActiveComponent />
          </main>

          {/* Image Library Sidebar */}
          <aside className="library-sidebar">
            <ImageLibrary language={language} onTransferToTab={handleTransferToTab} />
          </aside>
        </div>


      </div>
    </ImageLibraryProvider>
  )
}

export default App 