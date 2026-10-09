import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import { ROUTES } from '@/constants'
import { AppLayout } from '@/layouts/AppLayout'
import { AuthLayout } from '@/layouts/AuthLayout'

import { ProtectedRoute, GuestRoute, BusinessRequiredRoute } from './guards'

// Auth pages
const LoginPage = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPasswordPage'))

// App pages
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const ReviewsPage = lazy(() => import('@/pages/ReviewsPage'))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'))
const CustomersPage = lazy(() => import('@/pages/CustomersPage'))
const CampaignsPage = lazy(() => import('@/pages/CampaignsPage'))
const SubmissionsPage = lazy(() => import('@/pages/SubmissionsPage'))
const RewardsPage = lazy(() => import('@/pages/RewardsPage'))
const WalletPage = lazy(() => import('@/pages/WalletPage'))
const RefundsPage = lazy(() => import('@/pages/RefundsPage'))
const FinancePage = lazy(() => import('@/pages/FinancePage'))
const DocumentsPage = lazy(() => import('@/pages/DocumentsPage'))
const TeamPage = lazy(() => import('@/pages/TeamPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const SupportPage = lazy(() => import('@/pages/SupportPage'))
const WebhooksPage = lazy(() => import('@/pages/WebhooksPage'))
const SubscriptionPage = lazy(() => import('@/pages/SubscriptionPage'))
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
            // Open to every signed-in person: the business is created on Profile.
            { path: ROUTES.PROFILE, element: <ProfilePage /> },
            { path: ROUTES.SETTINGS, element: <SettingsPage /> },
            {
              element: <BusinessRequiredRoute />,
              children: [
                { path: ROUTES.DASHBOARD, element: <DashboardPage /> },
                { path: ROUTES.REVIEWS, element: <ReviewsPage /> },
                { path: ROUTES.CUSTOMERS, element: <CustomersPage /> },
                { path: ROUTES.CAMPAIGNS, element: <CampaignsPage /> },
                { path: ROUTES.SUBMISSIONS, element: <SubmissionsPage /> },
                { path: ROUTES.ANALYTICS, element: <AnalyticsPage /> },
                { path: ROUTES.REWARDS, element: <RewardsPage /> },
                { path: ROUTES.WALLET, element: <WalletPage /> },
                { path: ROUTES.REFUNDS, element: <RefundsPage /> },
                { path: ROUTES.FINANCE, element: <FinancePage /> },
                { path: ROUTES.DOCUMENTS, element: <DocumentsPage /> },
                { path: ROUTES.TEAM, element: <TeamPage /> },
                { path: ROUTES.SUPPORT, element: <SupportPage /> },
                { path: ROUTES.WEBHOOKS, element: <WebhooksPage /> },
                { path: ROUTES.SUBSCRIPTION, element: <SubscriptionPage /> },
              ],
            },
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
