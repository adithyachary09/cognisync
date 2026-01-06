"use client";

import { MainPage } from "@/components/pages/main-page";
import { JournalPage } from "@/components/pages/journal-page";
import { InsightsPage } from "@/components/pages/insights-page";
import { AwarenessPage } from "@/components/pages/awareness-page";
import { TestsPage } from "@/components/pages/tests-page";
import { ReportPage } from "@/components/pages/report-page";
import { ChatbotPage } from "@/components/pages/chatbot-page";
 import SettingsPage from "@/components/pages/settings-page";


interface MainContentProps {
  activePage: string;
  userName: string;
  userId: string;
}

export function MainContent({
  activePage,
  userName,
  userId,
}: MainContentProps) {
  switch (activePage) {
    case "main":
      return <MainPage userName={userName} userId={userId} />;

    case "journal":
      return <JournalPage />;

    case "insights":
      return <InsightsPage />;

    case "awareness":
      return <AwarenessPage />;

    case "tests":
      return <TestsPage />;

    case "report":
      return <ReportPage />;

    case "chatbot":
      return <ChatbotPage />;

    case "settings":
      return <SettingsPage />;

    default:
      return <MainPage userName={userName} userId={userId} />;
  }
}
