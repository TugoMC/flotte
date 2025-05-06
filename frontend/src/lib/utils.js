// src/lib/utils.js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Cette fonction combine les classes conditionnelles avec tailwind-merge
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Formatage de date
export function formatDate(date) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Formatage de devise
export function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

// Vérifier si l'utilisateur a un rôle suffisant
export function hasRole(userRole, requiredRole) {
  const roles = ['driver', 'manager', 'admin'];
  const userRoleIndex = roles.indexOf(userRole);
  const requiredRoleIndex = roles.indexOf(requiredRole);

  return userRoleIndex >= requiredRoleIndex;
}

// Extraire initiales du nom
export function getInitials(firstName, lastName) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}