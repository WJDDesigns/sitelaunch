"use client";

import dynamic from "next/dynamic";

const InsightsDashboard = dynamic(() => import("./InsightsDashboard"), { ssr: false });

export default InsightsDashboard;
