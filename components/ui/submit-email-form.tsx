"use client";

import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import majors from "@/data/majors.json"; // Import majors JSON
import minors from "@/data/minors.json"; // Import minors JSON
import { Snackbar, Alert, Button, FormControlLabel, Radio, RadioGroup } from "@mui/material";
import { Geist_Mono } from "next/font/google";

// Validation Schema
const schema = yup.object().shape({
  firstName: yup.string().required("First Name is required"),
  lastName: yup.string().required("Last Name is required"),
  university: yup.string().required("University Name is required"),
  email: yup.string().email("Invalid email").required("University Email is required"),
  major: yup.string().required("Desired Major is required"),
  secondMajor: yup.string().notRequired(),
  numberOfMinors: yup.number().min(0).max(3).required(),
  minors: yup.array().of(yup.string()).max(3, "You can select up to 3 minors"),
});

export function SubmitEmailForm() {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      minors: [],
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [showSecondMajor, setShowSecondMajor] = useState(false);

  // Watch values for dynamic fields
  const numberOfMinors = watch("numberOfMinors");

  const showSnackbar = (message: string, severity: "success" | "error") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    console.log("Submitting form data:", JSON.stringify(data, null, 2));

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || "Failed to send email.");

      showSnackbar("Your request has been sent successfully!", "success");
    } catch (error) {
      console.error("Error submitting form:", error);
      showSnackbar("Something went wrong. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* First Name & Last Name (Side by Side) */}
        <div className="flex space-x-2">
          <div className="flex-1">
            <Input type="text" placeholder="First Name" {...register("firstName")} />
            {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName.message}</p>}
          </div>
          <div className="flex-1">
            <Input type="text" placeholder="Last Name" {...register("lastName")} />
            {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName.message}</p>}
          </div>
        </div>

        {/* University Email */}
        <div>
          <Input type="email" placeholder="University Email" {...register("email")} />
          {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}
        </div>

        {/* University Dropdown */}
        <div>
          <select {...register("university")} className="w-full border border-gray-300 p-2 rounded-md">
            <option value="">Select Your University</option>
            <option value="BYU">Brigham Young University - Provo</option>
            <option value="UVU">Utah Valley University</option>
            <option value="UofU">University of Utah</option>
          </select>
          {errors.university && <p className="text-red-500 text-sm">{errors.university.message}</p>}
        </div>

        {/* Major Dropdown */}
        <div>
          <select {...register("major")} className="w-full border border-gray-300 p-2 rounded-md">
            <option value="">Select a Major</option>
            {majors.map((major) => (
              <option key={major.id} value={major.id}>
                {major.name}
              </option>
            ))}
          </select>
          {errors.major && <p className="text-red-500 text-sm">{errors.major.message}</p>}
          <Button
            type="button"
            onClick={() => setShowSecondMajor(!showSecondMajor)}
            className="font-body"
            sx={{
              color: "black",
              padding: 0,
            }}
          >
            {showSecondMajor ? "Remove Second Major" : "Add A Second Major"}
          </Button>
        </div>

        {/* Second Major dropdown */}
        {showSecondMajor && (
          <div>
            <select {...register("secondMajor")} className="w-full border border-gray-300 p-2 rounded-md">
              <option value="">Select a Second Major</option>
              {majors.map((major) => (
                <option key={major.id} value={major.id}>
                  {major.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Ask how many minors the user wants */}
        <div>
          <select {...register("numberOfMinors")} className="w-full border border-gray-300 p-2 rounded-md">
            <option value="">Select Number of Minors</option>
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </div>

        {/* Dynamically generated minor dropdowns */}
        {Array.from({ length: numberOfMinors }, (_, index) => (
          <div key={index}>
            <select {...register(`minors.${index}`)} className="w-full border border-gray-300 p-2 rounded-md">
              <option value="">Select a Minor</option>
              {minors.map((minor) => (
                <option key={minor.id} value={minor.id}>
                  {minor.name}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* Submit Button */}
        <Button
          type="submit"
          color="primary"
          variant="contained"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Join the Waitlist"}
        </Button>
      </form>

      {/* Snackbar Component */}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity as "success" | "error"} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
