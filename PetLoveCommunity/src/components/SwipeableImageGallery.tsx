// Pet Love Community - Swipeable Image Gallery Component
// Smooth animated gallery for pet photos with zoom and navigation

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Modal,
  SafeAreaView,
} from 'react-native';
import { useColors } from '../hooks/useColors';
import Button from './Button';

interface SwipeableImageGalleryProps {
  photos: Array<{ url: string; caption?: string }>;
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
  petName?: string;
}

interface ImageSlideProps {
  photo: { url: string; caption?: string };
  isActive: boolean;
  screenWidth: number;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ImageSlide: React.FC<ImageSlideProps> = ({ photo, isActive, screenWidth }) => {
  const colors = useColors();

  return (
    <View style={[styles.slide, { width: screenWidth }]}>
      {/* Image Placeholder */}
      <View style={[styles.imagePlaceholder, { backgroundColor: colors.extended.tealVariations.background }]}>
        <Text style={[styles.placeholderText, { color: colors.neutral.midnight }]}>
          📷
        </Text>
        <Text style={[styles.placeholderSubtext, { color: colors.extended.textVariations.secondary }]}>
          Photo Loading
        </Text>
        {/* TODO: Replace with actual Image component when implementing real images */}
        {/* <Image source={{ uri: photo.url }} style={styles.image} resizeMode="contain" /> */}
      </View>
      
      {/* Caption */}
      {photo.caption && (
        <View style={[styles.captionContainer, { backgroundColor: colors.neutral.beige }]}>
          <Text style={[styles.captionText, { color: colors.neutral.midnight }]}>
            {photo.caption}
          </Text>
        </View>
      )}
    </View>
  );
};

const SwipeableImageGallery: React.FC<SwipeableImageGalleryProps> = ({
  photos,
  initialIndex = 0,
  visible,
  onClose,
  petName,
}) => {
  const colors = useColors();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / screenWidth);
    setCurrentIndex(newIndex);
  };

  const goToSlide = (index: number) => {
    if (flatListRef.current && index >= 0 && index < photos.length) {
      flatListRef.current.scrollToIndex({ index, animated: true });
      setCurrentIndex(index);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      goToSlide(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < photos.length - 1) {
      goToSlide(currentIndex + 1);
    }
  };

  const renderPhoto = ({ item, index }: { item: { url: string; caption?: string }; index: number }) => (
    <ImageSlide
      photo={item}
      isActive={index === currentIndex}
      screenWidth={screenWidth}
    />
  );

  const renderDot = (index: number) => {
    const isActive = index === currentIndex;
    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.dot,
          {
            backgroundColor: isActive ? colors.primary.coral : colors.extended.textVariations.tertiary,
            width: isActive ? 12 : 8,
            height: isActive ? 12 : 8,
          },
        ]}
        onPress={() => goToSlide(index)}
        activeOpacity={0.7}
      />
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.9)" translucent />
      <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.95)' }]}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.titleSection}>
                {petName && (
                  <Text style={[styles.petName, { color: '#FFFFFF' }]}>
                    {petName}
                  </Text>
                )}
                <Text style={[styles.photoCounter, { color: colors.extended.textVariations.tertiary }]}>
                  {currentIndex + 1} of {photos.length}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: colors.extended.textVariations.tertiary }]}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Photo Gallery */}
          <View style={styles.galleryContainer}>
            <FlatList
              ref={flatListRef}
              data={photos}
              renderItem={renderPhoto}
              keyExtractor={(_, index) => index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              initialScrollIndex={initialIndex}
              getItemLayout={(_, index) => ({
                length: screenWidth,
                offset: screenWidth * index,
                index,
              })}
            />

            {/* Navigation Arrows */}
            {photos.length > 1 && (
              <>
                {/* Previous Button */}
                <TouchableOpacity
                  style={[styles.navButton, styles.prevButton]}
                  onPress={goToPrevious}
                  disabled={currentIndex === 0}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.navButtonContent,
                      {
                        backgroundColor: currentIndex === 0 
                          ? 'rgba(255,255,255,0.3)' 
                          : 'rgba(255,255,255,0.8)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.navButtonText,
                        { color: currentIndex === 0 ? '#999' : '#000' },
                      ]}
                    >
                      ‹
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Next Button */}
                <TouchableOpacity
                  style={[styles.navButton, styles.nextButton]}
                  onPress={goToNext}
                  disabled={currentIndex === photos.length - 1}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.navButtonContent,
                      {
                        backgroundColor: currentIndex === photos.length - 1 
                          ? 'rgba(255,255,255,0.3)' 
                          : 'rgba(255,255,255,0.8)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.navButtonText,
                        { color: currentIndex === photos.length - 1 ? '#999' : '#000' },
                      ]}
                    >
                      ›
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Footer with Dots */}
          {photos.length > 1 && (
            <View style={styles.footer}>
              <View style={styles.dotsContainer}>
                {photos.map((_, index) => renderDot(index))}
              </View>
              
              {/* Share Button */}
              <View style={styles.shareContainer}>
                <Button
                  title="Share Photo"
                  onPress={() => {
                    // TODO: Implement photo sharing functionality
                    console.log('Share photo:', photos[currentIndex].url);
                  }}
                  type="secondary"
                  style={styles.shareButton}
                />
              </View>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleSection: {
    flex: 1,
  },
  petName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  photoCounter: {
    fontSize: 14,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  galleryContainer: {
    flex: 1,
    position: 'relative',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  imagePlaceholder: {
    width: screenWidth - 32,
    height: screenHeight * 0.6,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  placeholderText: {
    fontSize: 48,
    marginBottom: 8,
  },
  placeholderSubtext: {
    fontSize: 16,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  captionContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    maxWidth: screenWidth - 64,
  },
  captionText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    zIndex: 10,
  },
  prevButton: {
    left: 16,
    transform: [{ translateY: -25 }],
  },
  nextButton: {
    right: 16,
    transform: [{ translateY: -25 }],
  },
  navButtonContent: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  dot: {
    borderRadius: 6,
  },
  shareContainer: {
    alignItems: 'center',
  },
  shareButton: {
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});

export default SwipeableImageGallery;