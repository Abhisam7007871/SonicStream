"use client";

import { useState, useEffect } from 'react';
import styles from './AudiomackPlayer.module.css';

interface AudiomackEmbed {
  html: string;
  title: string;
  author_name: string;
}

interface AudiomackPlayerProps {
  trackUrl: string;
  onClose?: () => void;
}

export default function AudiomackPlayer({ trackUrl, onClose }: AudiomackPlayerProps) {
  const [embed, setEmbed] = useState<AudiomackEmbed | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (trackUrl) {
      setLoading(true);
      fetch(`https://audiomack.com/oembed?url=${encodeURIComponent(trackUrl)}&format=json`)
        .then(r => r.json())
        .then(data => {
          setEmbed(data);
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to load Audiomack embed', err);
          setLoading(false);
        });
    }
  }, [trackUrl]);

  if (loading) {
    return (
      <div className={`${styles.container} glass`}>
        <div className={styles.loading}>Loading Audiomack Player...</div>
      </div>
    );
  }

  if (!embed) return null;

  return (
    <div className={`${styles.container} glass`}>
      <div className={styles.header}>
        <div className={styles.meta}>
          <span className={styles.title}>{embed.title}</span>
          <span className={styles.artist}>{embed.author_name}</span>
        </div>
        {onClose && (
          <button onClick={onClose} className={styles.closeBtn}>×</button>
        )}
      </div>
      <div 
        className={styles.embedWrapper}
        dangerouslySetInnerHTML={{ __html: embed.html }} 
      />
    </div>
  );
}
