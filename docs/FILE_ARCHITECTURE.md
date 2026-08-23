```text
Directory structure:
└── haoraaaannnn-heart-check-phc/
    ├── README.md
    ├── declaration.d.ts
    ├── eslint.config.mjs
    ├── next.config.ts
    ├── package.json
    ├── postcss.config.mjs
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── provider.tsx
    │   ├── actions/
    │   │   └── sendSMS.ts
    │   ├── api/
    │   │   ├── auth/
    │   │   │   └── login/
    │   │   │       └── route.ts
    │   │   ├── print-ticket/
    │   │   │   └── route.ts
    │   │   └── superadmin/
    │   │       ├── create-user/
    │   │       │   └── route.ts
    │   │       ├── delete-user/
    │   │       │   └── route.ts
    │   │       ├── sync-users/
    │   │       │   └── route.ts
    │   │       └── update-role/
    │   │           └── route.ts
    │   ├── dashboard/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   ├── analytics/
    │   │   │   ├── page.tsx
    │   │   │   ├── components/
    │   │   │   │   ├── AlgorithmComparisonTable.tsx
    │   │   │   │   ├── ArimaForecast.tsx
    │   │   │   │   ├── DateRangeSelector.tsx
    │   │   │   │   ├── LRForecast.tsx
    │   │   │   │   ├── MetricCardShow.tsx
    │   │   │   │   └── VolumeAndWaitCharts.tsx
    │   │   │   └── hooks/
    │   │   │       └── useAnalyticsData.ts
    │   │   ├── components/
    │   │   │   ├── DashboardMetrics.tsx
    │   │   │   ├── HistoricalContextBanner.tsx
    │   │   │   ├── HourlyArrivalChart.tsx
    │   │   │   ├── LiveQueueTable.tsx
    │   │   │   ├── NotificationDropdown.tsx
    │   │   │   ├── ServiceStats.tsx
    │   │   │   ├── StatusBadge.tsx
    │   │   │   └── navigation/
    │   │   │       ├── DashboardHeader.tsx
    │   │   │       └── DashSideNavigation.tsx
    │   │   ├── context/
    │   │   │   └── HistoricalSummaryContext.tsx
    │   │   ├── cubicles/
    │   │   │   └── page.tsx
    │   │   ├── hooks/
    │   │   │   ├── useBottleneckNotifications.ts
    │   │   │   └── useOverviewData.ts
    │   │   ├── patients/
    │   │   │   ├── page.tsx
    │   │   │   ├── components/
    │   │   │   │   ├── HourlyPatientFlowChart.tsx
    │   │   │   │   ├── PatientStatGrid.tsx
    │   │   │   │   ├── RecentPatientTable.tsx
    │   │   │   │   └── ServiceDistributionChart.tsx
    │   │   │   ├── constants/
    │   │   │   │   └── patients.ts
    │   │   │   └── hooks/
    │   │   │       ├── usePatientsAnalyticsData.ts
    │   │   │       └── usePatientsData.ts
    │   │   └── servicesPHC/
    │   │       ├── benzathine/
    │   │       │   └── page.tsx
    │   │       ├── components/
    │   │       │   └── ServiceDashboard.tsx
    │   │       ├── consultation/
    │   │       │   └── page.tsx
    │   │       ├── ecg/
    │   │       │   └── page.tsx
    │   │       ├── opdCard/
    │   │       │   └── page.tsx
    │   │       ├── opdReschedule/
    │   │       │   └── page.tsx
    │   │       ├── opdScreening/
    │   │       │   └── page.tsx
    │   │       ├── refillPrescription/
    │   │       │   └── page.tsx
    │   │       └── warfarin/
    │   │           └── page.tsx
    │   ├── kiosk/
    │   │   ├── layout.tsx
    │   │   ├── confirmation/
    │   │   │   ├── layout.tsx
    │   │   │   ├── page.tsx
    │   │   │   └── components/
    │   │   │       ├── ConfimationDescription.tsx
    │   │   │       ├── ConfirmationActions.tsx
    │   │   │       ├── ConfirmationBanner.tsx
    │   │   │       └── ConfirmationModal.tsx
    │   │   ├── consultation-category/
    │   │   │   └── page.tsx
    │   │   ├── kiosk-cubicle-selection/
    │   │   │   ├── layout.tsx
    │   │   │   ├── page.tsx
    │   │   │   ├── components/
    │   │   │   │   ├── CubicleCard.tsx
    │   │   │   │   └── CubicleHeader.tsx
    │   │   │   └── types/
    │   │   │       └── CubicleSelectorType.ts
    │   │   ├── kiosk-new-old-selection/
    │   │   │   ├── layout.tsx
    │   │   │   ├── page.tsx
    │   │   │   ├── components/
    │   │   │   │   ├── KioskTitle.tsx
    │   │   │   │   ├── PatientTypeBanner.tsx
    │   │   │   │   └── PatientTypeCards.tsx
    │   │   │   └── types/
    │   │   │       └── PatientType.ts
    │   │   ├── kiosk-services/
    │   │   │   ├── layout.tsx
    │   │   │   ├── page.tsx
    │   │   │   └── components/
    │   │   │       ├── KioskBackButton.tsx
    │   │   │       ├── KioskBanner.tsx
    │   │   │       ├── KioskHeader.tsx
    │   │   │       ├── KioskServicesCard.tsx
    │   │   │       └── KioskServicesGrid.tsx
    │   │   ├── queue-print/
    │   │   │   ├── layout.tsx
    │   │   │   ├── page.tsx
    │   │   │   └── components/
    │   │   │       ├── PrintFooter.tsx
    │   │   │       ├── PrintHeader.tsx
    │   │   │       └── QueuePrintContent.tsx
    │   │   └── sms-input/
    │   │       ├── layout.tsx
    │   │       ├── page.tsx
    │   │       └── components/
    │   │           ├── ContinueButton.tsx
    │   │           ├── KioskPhoneEntry.tsx
    │   │           ├── NumPad.tsx
    │   │           ├── PhoneInput.tsx
    │   │           ├── SMSBanner.tsx
    │   │           └── SMSInstruction.tsx
    │   ├── login/
    │   │   └── page.tsx
    │   ├── monitor/
    │   │   ├── page.tsx
    │   │   ├── [category]/
    │   │   │   └── page.tsx
    │   │   ├── components/
    │   │   │   ├── ElapsedTimer.tsx
    │   │   │   ├── Footer.tsx
    │   │   │   ├── Header.tsx
    │   │   │   ├── PairedLayout.tsx
    │   │   │   ├── RegistrationLayout.tsx
    │   │   │   ├── StartScreen.tsx
    │   │   │   └── TableLayout.tsx
    │   │   ├── hooks/
    │   │   │   ├── useMonitorData.ts
    │   │   │   └── useRealtimeSubscription.ts
    │   │   └── lib/
    │   │       └── constants.ts
    │   ├── nurse/
    │   │   ├── page.tsx
    │   │   ├── components/
    │   │   │   ├── AssignedSection.tsx
    │   │   │   ├── CarryoutSection.tsx
    │   │   │   ├── ElapsedTimer.tsx
    │   │   │   ├── FinishedTable.tsx
    │   │   │   ├── Sidebar.tsx
    │   │   │   └── WithDoctorSection.tsx
    │   │   ├── hooks/
    │   │   │   ├── useNurseActions.ts
    │   │   │   ├── useNurseData.ts
    │   │   │   └── useRealtimeSubscription.ts
    │   │   └── lib/
    │   │       └── constants.ts
    │   ├── superadmin/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   ├── components/
    │   │   │   ├── SettingsPannel.tsx
    │   │   │   └── SuperAdminNav.tsx
    │   │   └── customization/
    │   │       └── page.tsx
    │   └── transfer/
    │       ├── page.tsx
    │       ├── components/
    │       │   ├── BreadcrumbNav.tsx
    │       │   ├── ConsultationFlow.tsx
    │       │   ├── CubicleCard.tsx
    │       │   ├── DoctorsModal.tsx
    │       │   ├── DoctorsPanel.tsx
    │       │   ├── ElapsedTimer.tsx
    │       │   ├── OnProgressSection.tsx
    │       │   ├── OPScreeningFlow.tsx
    │       │   ├── OtherServicesFlow.tsx
    │       │   ├── RegistrationCounterSection.tsx
    │       │   └── Sidebar.tsx
    │       ├── hooks/
    │       │   ├── useAutoAssign.ts
    │       │   ├── useAutoRotate.ts
    │       │   ├── useCubicleData.ts
    │       │   ├── useDragAndDrop.ts
    │       │   ├── usePatientData.ts
    │       │   ├── useRealtimeSubscription.ts
    │       │   ├── useRegistrationDragAndDrop.ts
    │       │   └── useRotateTimeout.ts
    │       └── lib/
    │           └── constants.ts
    ├── components/
    │   ├── backgrounds/
    │   │   ├── DashboardBg.tsx
    │   │   └── Univbackground.tsx
    │   ├── reusables/
    │   │   ├── analyticsMetricCards.tsx
    │   │   ├── analyticsMetricHeader.tsx
    │   │   ├── analyticsMetricPara.tsx
    │   │   ├── metricCards.tsx
    │   │   ├── patientHeaderCard.tsx
    │   │   ├── patientMetricCard.tsx
    │   │   └── serviceMetricCard.tsx
    │   └── ui/
    │       ├── bgCard.tsx
    │       ├── bgDisplay.tsx
    │       ├── ConfirmationModal.tsx
    │       └── displayHeader.tsx
    ├── constants/
    │   ├── themes.js
    │   └── themestesting.js
    ├── docs/
    │   ├── ARCHITECTURE.md
    │   ├── CHANGES_NEEDED.md
    │   ├── DATABASE_SCHEMA.md
    │   ├── FILE_ARCHITECTURE.md
    │   ├── OPEN_ISSUES.md
    │   ├── PRD.md
    │   ├── SCHEMA_REFERENCE.md
    │   ├── SECURITY.md
    │   ├── SETUP_AND_SEEDING.md
    │   └── TASKS.md
    ├── fonts/
    │   └── fonts.ts
    ├── lib/
    │   ├── logger.ts
    │   ├── printer.ts
    │   ├── supabase.ts
    │   └── supabase/
    │       ├── admin.ts
    │       ├── client.ts
    │       ├── server.ts
    │       └── superadminGuard.ts
    ├── python_backend/
    │   ├── auto_seed.sh
    │   ├── check_dates.py
    │   ├── db_seeder.py
    │   ├── debug_analytics.py
    │   ├── import_phc_data.py
    │   ├── import_seeder_to_supabase.py
    │   ├── main.py
    │   ├── requirements.txt
    │   ├── run.py
    │   ├── analytics/
    │   │   ├── __init__.py
    │   │   ├── constants.py
    │   │   ├── descriptive.py
    │   │   ├── forecasting.py
    │   │   ├── helpers.py
    │   │   ├── preprocessing.py
    │   │   ├── queue_metrics.py
    │   │   ├── report.py
    │   │   └── staffing.py
    │   └── testers/
    │       ├── test_analytics.py
    │       ├── test_arima.py
    │       ├── test_arima_aic.py
    │       ├── test_forecasting_pipeline.py
    │       └── test_staffing.py
    ├── types/
    │   ├── Services.ts
    │   └── Types.ts
    └── utils/
        ├── chartDataPrep.ts
        └── waitTime.ts
```
