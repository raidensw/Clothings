import React, { useState } from 'react';

function resizeImage(file, maxSize = 800) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = Math.round((height * maxSize) / width);
          width = maxSize;
        } else {
          width = Math.round((width * maxSize) / height);
          height = maxSize;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
    };
    img.src = url;
  });
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export default function UploadItem() {
  const [type, setType] = useState('clothing');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [duplicates, setDuplicates] = useState({});

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setPreviews(selectedFiles.map(f => URL.createObjectURL(f)));
  };

  const checkDuplicates = async (tags, draftId) => {
    if (!tags.category || !tags.color) return;
    try {
      const res = await fetch('/api/clothing/check-duplicate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: tags.category, color: tags.color })
      });
      const data = await res.json();
      if (data.duplicates && data.duplicates.length > 0) {
        setDuplicates(prev => ({ ...prev, [draftId]: data.duplicates }));
      }
    } catch {}
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setLoading(true);
    setDrafts([]);
    setDuplicates({});
    
    let newDrafts = [];
    for (let i = 0; i < files.length; i++) {
      setProgress(`Analyzing image ${i + 1} of ${files.length}...`);

      try {
        const resizedBlob = await resizeImage(files[i]);
        const formData = new FormData();
        formData.append('image', resizedBlob, files[i].name.replace(/\.[^.]+$/, '.jpg'));

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000);

        const res = await fetch(`/api/${type}/upload`, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
        clearTimeout(timeout);

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Add default brand and price fields for clothing
        const tags = type === 'clothing' ? { brand: '', purchase_price: '', ...data.tags } : data.tags;
        
        const newDraft = {
          id: i,
          preview: previews[i],
          image_path: data.image_path,
          tags
        };

        newDrafts.push(newDraft);
        setDrafts([...newDrafts]);

        if (type === 'clothing') {
          checkDuplicates(tags, i);
        }

        if (i < files.length - 1) await delay(700);

      } catch (err) {
        if (err.name === 'AbortError') {
          alert(`Timed out analyzing ${files[i].name}. Try uploading fewer images at once.`);
        } else {
          alert(`Failed: ${files[i].name} — ${err.message}`);
        }
      }
    }
    
    setLoading(false);
    setProgress('');
  };

  const handleBackPhotoUpload = async (draftId, file) => {
    try {
      const resizedBlob = await resizeImage(file);
      const formData = new FormData();
      formData.append('back_image', resizedBlob, file.name.replace(/\.[^.]+$/, '.jpg'));

      const res = await fetch('/api/clothing/upload-back', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.back_image_path) {
        setDrafts(drafts.map(d => d.id === draftId ? {
          ...d,
          back_image_path: data.back_image_path,
          back_preview: URL.createObjectURL(file)
        } : d));
      }
    } catch (err) {
      alert('Failed to upload back photo: ' + err.message);
    }
  };

  const handleSave = async (draftId) => {
    const draft = drafts.find(d => d.id === draftId);
    if (!draft) return;
    
    try {
      const res = await fetch(`/api/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_path: draft.image_path,
          back_image_path: draft.back_image_path || null,
          ...draft.tags
        }),
      });
      
      if (!res.ok) throw new Error("Save failed");
      
      setDrafts(drafts.filter(d => d.id !== draftId));
      alert('Saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save item');
    }
  };

  const handleTagChange = (draftId, tagKey, value) => {
    setDrafts(drafts.map(d => {
      if (d.id !== draftId) return d;
      const updatedTags = { ...d.tags, [tagKey]: value };
      if (type === 'clothing' && (tagKey === 'category' || tagKey === 'color')) {
        checkDuplicates(updatedTags, draftId);
      }
      return { ...d, tags: updatedTags };
    }));
  };

  const resetAll = () => {
    setFiles([]);
    setPreviews([]);
    setDrafts([]);
    setDuplicates({});
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '4rem', animation: 'fadeIn 0.6s ease-out' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Catalog New Pieces</h2>
        <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.1rem' }}>
          Upload garments (Front & Back photos) or fragrances to scan them with AI cataloging
        </p>
      </div>
      
      {drafts.length === 0 ? (
        <div className="hangtag" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <button
                className={`type-selector-btn ${type === 'clothing' ? 'active' : ''}`}
                onClick={() => setType('clothing')}
              >
                Clothing
              </button>
              <button
                className={`type-selector-btn ${type === 'scents' ? 'active' : ''}`}
                onClick={() => setType('scents')}
              >
                Scent
              </button>
            </div>
          </div>

          <div className="upload-dragzone" style={{ margin: '1.5rem 0', position: 'relative' }}>
            <input 
              type="file" 
              id="file-upload-input"
              accept="image/*" 
              multiple 
              onChange={handleFileChange} 
              style={{ display: 'none' }} 
            />
            <label htmlFor="file-upload-input" style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{ marginBottom: '1.25rem', display: 'inline-flex' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-olive)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3c0 1 .5 1.5 1 2.5L2 17a2 2 0 0 0 1 3.5h18a2 2 0 0 0 1-3.5L14 7.5c.5-1 1-1.5 1-2.5a3 3 0 0 0-3-3z"/>
                </svg>
              </div>
              <h4 style={{ fontSize: '1.4rem', marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>
                {files.length > 0 ? `${files.length} image(s) selected` : 'Select Closet Images'}
              </h4>
              <p style={{ fontSize: '0.85rem' }}>
                Click to browse files (Front photos required; back photos can be added on next step)
              </p>
            </label>
          </div>
          
          {previews.length > 0 && (
            <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', marginBottom: '1.5rem', padding: '0.5rem 0' }}>
              {previews.map((src, idx) => (
                <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                  <img src={src} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}

          <button 
            className="btn btn-primary" 
            onClick={handleUpload} 
            disabled={files.length === 0 || loading} 
            style={{ width: '100%', height: '48px' }}
          >
            {loading ? (progress || 'Uploading...') : `Upload & Analyze ${files.length > 0 ? files.length : ''} Items`}
          </button>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.8rem' }}>Confirm AI Recommendations</h3>
            <button className="btn btn-danger" onClick={resetAll}>Discard All</button>
          </div>
          
          <div className="grid">
            {drafts.map(draft => (
              <div key={draft.id} className="hangtag" style={{ gap: '1rem' }}>
                {/* Front and Back previews side-by-side or tabbed */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', textAlign: 'center' }}>FRONT</div>
                    <div className="hangtag-img-container" style={{ paddingTop: '100%', borderRadius: '8px', overflow: 'hidden' }}>
                      <img src={draft.preview} alt="Front View" className="hangtag-img" style={{ objectFit: 'contain', backgroundColor: '#F8F6F2' }} />
                    </div>
                  </div>

                  {type === 'clothing' && (
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem', textAlign: 'center' }}>BACK (OPTIONAL)</div>
                      <div className="hangtag-img-container" style={{ paddingTop: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {draft.back_preview ? (
                          <img src={draft.back_preview} alt="Back View" className="hangtag-img" style={{ objectFit: 'contain', backgroundColor: '#F8F6F2' }} />
                        ) : (
                          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', cursor: 'pointer', padding: '0.5rem', textAlign: 'center' }}>
                            <span style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>📸</span>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Add Back Photo</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => e.target.files[0] && handleBackPhotoUpload(draft.id, e.target.files[0])} 
                              style={{ display: 'none' }} 
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Duplicate alert if found */}
                {duplicates[draft.id] && duplicates[draft.id].length > 0 && (
                  <div style={{ background: 'rgba(163, 78, 54, 0.1)', border: '1px solid rgba(163, 78, 54, 0.3)', borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.75rem', color: '#A34E36' }}>
                    ⚠️ Possible duplicate: You already have {duplicates[draft.id].length} similar item(s) ({duplicates[draft.id][0].color} {duplicates[draft.id][0].category}) in your closet.
                  </div>
                )}
                
                {/* Editable tags */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {Object.keys(draft.tags).map(key => (
                    <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ 
                        fontFamily: 'var(--font-mono)', 
                        fontSize: '0.65rem', 
                        color: 'var(--text-muted)', 
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {key.replace('_', ' ')}
                      </label>
                      <input 
                        type={key === 'purchase_price' ? 'number' : 'text'} 
                        value={draft.tags[key] || ''} 
                        onChange={(e) => handleTagChange(draft.id, key, e.target.value)} 
                        placeholder={key === 'brand' ? 'e.g. Zara, Nike' : key === 'purchase_price' ? '0.00' : ''}
                        style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }} 
                      />
                    </div>
                  ))}
                </div>
                
                <button type="button" className="btn btn-primary" onClick={() => handleSave(draft.id)} style={{ width: '100%', marginTop: 'auto' }}>
                  Save Item
                </button>
              </div>
            ))}
          </div>
          
          {drafts.length === 0 && (
            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
              <p style={{ fontStyle: 'italic', marginBottom: '1.5rem' }}>All new items cataloged successfully!</p>
              <button className="btn btn-primary" onClick={resetAll}>Upload More</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
