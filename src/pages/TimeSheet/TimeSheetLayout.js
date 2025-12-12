import React from "react";
import { getCookie } from "../../services/Cookies";
import TimesheetCalendar from "./TimesheetCalendar";
import TimeSheetOverview from "./TimeSheetOverview";


export default function TimeSheetLayout() {

    const userRole = getCookie("role");
    const isAdmin = userRole === "Admin";
                        
    return isAdmin ? <TimeSheetOverview /> : <TimesheetCalendar />;

}
