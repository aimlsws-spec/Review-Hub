import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import { ROUTES } from '@/constants'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'

import { ProtectedRoute, GuestRoute } from './guards'

// Auth pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'))

// App pages
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const ReviewsPage = lazy(() => import('@/pages/ReviewsPage'))
const CustomersPage = lazy(() => import('@/pages/CustomersPage'))
const CampaignsPage = lazy(() => import('@/pages/CampaignsPage'))
const RewardsPage = lazy(() => import('@/pages/RewardsPage'))
const CouponsPage = lazy(() => import('@/pages/CouponsPage'))
const WalletPage = lazy(() => import('@/pages/WalletPage'))
const RefundsPage = lazy(() => import('@/pages/RefundsPage'))
const DocumentsPage = lazy(() => import('@/pages/DocumentsPage'))
const TeamPage = lazy(() => import('@/pages/TeamPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const SupportPage = lazy(() => import('@/pages/SupportPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Navigate to={ROUTES.DASHBOARD} replace />,
    },
    {
      element: <GuestRoute />,
      children: [
        {
          element: <AuthLayout />,
          children: [
            { path: ROUTES.LOGIN, element: <LoginPage /> },
            { path: ROUTES.REGISTER, element: <RegisterPage /> },
            { path: ROUTES.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
            { path: ROUTES.RESET_PASSWORD, element: <ResetPasswordPage /> },
          ],
        },
      ],
    },
    {
      element: <ProtectedRoute />,
      children: [
        {
          element: <AppLayout />,
          children: [
            { path: ROUTES.DASHBOARD, element: <DashboardPage /> },
            { path: ROUTES.PROFILE, element: <ProfilePage /> },
            { path: ROUTES.REVIEWS, element: <ReviewsPage /> },
            { path: ROUTES.CUSTOMERS, element: <CustomersPage /> },
            { path: ROUTES.CAMPAIGNS, element: <CampaignsPage /> },
            { path: ROUTES.REWARDS, element: <RewardsPage /> },
            { path: ROUTES.COUPONS, element: <CouponsPage /> },
            { path: ROUTES.WALLET, element: <WalletPage /> },
            { path: ROUTES.REFUNDS, element: <RefundsPage /> },
            { path: ROUTES.DOCUMENTS, element: <DocumentsPage /> },
            { path: ROUTES.TEAM, element: <TeamPage /> },
            { path: ROUTES.SETTINGS, element: <SettingsPage /> },
            { path: ROUTES.SUPPORT, element: <SupportPage /> },
          ],
        },
      ],
    },
    {
      path: '*',
      element: <NotFoundPage />,
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  },
)
