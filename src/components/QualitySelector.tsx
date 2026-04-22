"use client";

import { useState } from 'react';
import styles from './QualitySelector.module.css';
import { usePlayerStore } from '@/store/usePlayerStore';
import { Settings2, Check } from 'lucide-react';

const QUALITIES = [
  { id: '48kbps', label: 'Data Saver (48kbps)', tier: 'Free' },
  { id: '128kbps', label: 'Normal (128kbps)', tier: 'Free' },
  { id: '256kbps', label: 'High (256kbps)', tier: 'Basic' },
  { id: '320kbps', label: 'Very High (320kbps)', tier: 'Premium' },
  { id: 'FLAC', label: 'HiFi Lossless (FLAC)', tier: 'Premium' },
];

export default function QualitySelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { quality, setQuality } = usePlayerStore();

  return (
    <div className={styles.container}>
      <button 
        className={styles.trigger} 
        onClick={() => setIsOpen(!isOpen)}
        title="Audio Quality"
      >
        <span className={styles.qualityLabel}>{quality === 'FLAC' ? 'HiFi' : quality}</span>
        <Settings2 size={16} />
      </button>

      {isOpen && (
        <>
          <div className={styles.overlay} onClick={() => setIsOpen(false)} />
          <div className={styles.menu}>
            <h4 className={styles.menuTitle}>Audio Quality</h4>
            <div className={styles.qualityList}>
              {QUALITIES.map((q) => (
                <button 
                  key={q.id}
                  className={`${styles.qualityItem} ${quality === q.id ? styles.active : ''}`}
                  onClick={() => {
                    setQuality(q.id as any);
                    setIsOpen(false);
                  }}
                >
                  <div className={styles.itemInfo}>
                    <span className={styles.itemLabel}>{q.label}</span>
                    <span className={styles.tierBadge}>{q.tier}</span>
                  </div>
                  {quality === q.id && <Check size={16} className={styles.checkIcon} />}
                </button>
              ))}
            </div>
            <div className={styles.footer}>
              <button className={styles.upgradeButton}>Upgrade your plan for HiFi</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
