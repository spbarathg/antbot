use pyo3::prelude::*;
use pyo3::types::PyDict;
use anyhow::Result;
use std::path::PathBuf;

#[derive(Debug)]
pub struct PythonError {
    message: String,
    traceback: Option<String>,
}

impl From<PyErr> for PythonError {
    fn from(err: PyErr) -> Self {
        PythonError {
            message: err.to_string(),
            traceback: None,
        }
    }
}

impl std::fmt::Display for PythonError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Python error: {}", self.message)
    }
}

impl std::error::Error for PythonError {}

pub struct PythonContext {
    py: Python,
}

impl PythonContext {
    pub fn new() -> Result<Self> {
        Python::with_gil(|py| {
            Ok(Self { py })
        })
    }

    pub fn init_python_modules(&self, python_path: &PathBuf) -> Result<()> {
        let sys = self.py.import("sys")?;
        let path = sys.getattr("path")?;
        path.call_method1("append", (python_path.to_str().unwrap(),))?;
        Ok(())
    }

    pub fn import_module(&self, module_name: &str) -> Result<PyResult<PyObject>> {
        Ok(self.py.import(module_name))
    }

    pub fn call_function(&self, module: &str, function: &str, args: &[PyObject]) -> Result<PyObject> {
        let module = self.py.import(module)?;
        let func = module.getattr(function)?;
        Ok(func.call(args, None)?)
    }
}

#[pyfunction]
fn init_python_modules(python_path: &str) -> PyResult<()> {
    Python::with_gil(|py| {
        let sys = py.import("sys")?;
        let path = sys.getattr("path")?;
        path.call_method1("append", (python_path,))?;
        Ok(())
    })
}

pub fn init_python() -> Result<()> {
    let ctx = PythonContext::new()?;
    let python_path = PathBuf::from("./python");
    ctx.init_python_modules(&python_path)?;
    Ok(())
} 