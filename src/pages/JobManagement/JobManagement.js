import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
    Box,
    Tabs,
    Tab,
} from "@mui/material";
import { useLocation } from "react-router-dom";
import Breadcrumb from "../../services/Breadcrumb";
import JobPosted from "./JobPosted";
import Jobapplied from "./JobApplied";

const useStyles = makeStyles(() => ({
    rootBox: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 8,
        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
    },
    tabHeader: {
        borderBottom: "1px solid #e0e0e0",
        marginBottom: 16,
    },
}));

export default function JobManagement() {

    const classes = useStyles();
    const location = useLocation();

    const [viewTab, setViewTab] = useState(location.state?.tab || "jobPosted");


    const handleTabChange = (event, newValue) => {
        setViewTab(newValue);
    };

    return (
        <Box className={classes.rootBox}>
            <Breadcrumb items={[{ label: "Job Management" }]} />
            <Box className={classes.tabHeader}>
                <Tabs
                    value={viewTab}
                    onChange={handleTabChange}
                    textColor="primary"
                    indicatorColor="primary"
                    sx={{ mb: 2 }}
                >
                    <Tab value="jobPosted" label="Job Posted" />
                    <Tab value="jobApplied" label="Job Applied" />
                </Tabs>
            </Box>
            {viewTab === "jobPosted" ? 
                (<JobPosted />) : (<Jobapplied/>)
            }
        </Box>
    );
}