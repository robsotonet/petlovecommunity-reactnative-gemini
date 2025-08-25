// Pet Love Community - Pet Gallery Screen
// Full-screen photo gallery for pet images

import React from 'react';
import SwipeableImageGallery from '../components/SwipeableImageGallery';
import { useGetPetByIdQuery } from '../services/petApi';
import type { PetGalleryNavigationProp, PetGalleryRouteProp } from '../types/navigation';

interface PetGalleryScreenProps {
  route: PetGalleryRouteProp;
  navigation: PetGalleryNavigationProp;
}

const PetGalleryScreen: React.FC<PetGalleryScreenProps> = ({ route, navigation }) => {
  const { petId, photoIndex } = route.params;
  const { data: pet } = useGetPetByIdQuery(petId);

  const handleClose = () => {
    navigation.goBack();
  };

  if (!pet) {
    return null; // Or loading screen
  }

  // Convert pet photos to gallery format
  const galleryPhotos = pet.photos.map((photo) => ({
    url: photo.url,
    caption: photo.caption,
  }));

  return (
    <SwipeableImageGallery
      photos={galleryPhotos}
      initialIndex={photoIndex}
      visible={true}
      onClose={handleClose}
      petName={pet.name}
    />
  );
};

export default PetGalleryScreen;