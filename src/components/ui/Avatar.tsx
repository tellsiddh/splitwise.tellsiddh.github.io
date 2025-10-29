import React from 'react';
import { User } from '../../types';
import { getInitials, getAvatarColor } from '../../utils/helpers';

interface AvatarProps {
  user: User;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Avatar: React.FC<AvatarProps> = ({ user, size = 'md', className = '' }) => {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
    xl: 'h-16 w-16 text-lg',
  };

  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        className={`${sizes[size]} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center text-white font-medium ${getAvatarColor(
        user.name
      )} ${className}`}
    >
      {getInitials(user.name)}
    </div>
  );
};

export { Avatar };