import React from "react";
import { getCookie } from "../../services/Cookies";
import TimesheetCalendar from "./TimesheetCalendar";
import TimeSheetOverview from "./TimeSheetOverview";


export default function TimeSheetLayout() {

    const userRole = getCookie("role");
    const isAdminOrManager = userRole === "Admin" || userRole === "Manager";
                        
    return isAdminOrManager ? <TimeSheetOverview /> : <TimesheetCalendar />;

}
