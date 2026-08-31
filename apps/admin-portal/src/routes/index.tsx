import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import { ROUTES } from '@/constants'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'

import { ProtectedRoute, GuestRoute } from './guards'

// Auth pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'))

// App pages
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const UsersPage = lazy(() => import('@/pages/UsersPage'))
const MerchantsPage = lazy(() => import('@/pages/MerchantsPage'))
const CampaignQueuePage = lazy(() => import('@/pages/CampaignQueuePage'))
const WithdrawalQueuePage = lazy(() => import('@/pages/WithdrawalQueuePage'))
const FraudFlagsPage = lazy(() => import('@/pages/FraudFlagsPage'))
const SupportTicketsPage = lazy(() => import('@/pages/SupportTicketsPage'))
const CmsPagesPage = lazy(() => import('@/pages/cms/CmsPagesPage'))
const FaqsPage = lazy(() => import('@/pages/cms/FaqsPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const FeatureFlagsPage = lazy(() => import('@/pages/FeatureFlagsPage'))
const AuditLogsPage = lazy(() => import('@/pages/AuditLogsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
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
            { path: ROUTES.USERS, element: <UsersPage /> },
            { path: ROUTES.MERCHANTS, element: <MerchantsPage /> },
            { path: ROUTES.CAMPAIGNS, element: <CampaignQueuePage /> },
            { path: ROUTES.WITHDRAWALS, element: <WithdrawalQueuePage /> },
            { path: ROUTES.FRAUD, element: <FraudFlagsPage /> },
            { path: ROUTES.SUPPORT_TICKETS, element: <SupportTicketsPage /> },
            { path: ROUTES.CMS_PAGES, element: <CmsPagesPage /> },
            { path: ROUTES.FAQS, element: <FaqsPage /> },
            { path: ROUTES.SETTINGS, element: <SettingsPage /> },
            { path: ROUTES.FEATURE_FLAGS, element: <FeatureFlagsPage /> },
            { path: ROUTES.AUDIT_LOGS, element: <AuditLogsPage /> },
            { path: ROUTES.PROFILE, element: <ProfilePage /> },
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
