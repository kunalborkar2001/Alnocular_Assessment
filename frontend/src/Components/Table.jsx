import * as React from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Button, Modal, Box, Typography } from '@mui/material';
import * as XLSX from 'xlsx';
import BasicModal from './Modal';
import { getAllContacts, addContact, deleteContact, editContact, bulkAdd } from '../Apis/api';
import SearchBar from './SearchBar';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import BulkModal from './BulkModel';


const DataTable = () => {
    const [open, setOpen] = React.useState(false);
    const [initialRows, setInitialRows] = React.useState([]);
    const [searchValue, setSearchValue] = React.useState('')
    const [loadData, setLoadData] = React.useState(false)

    const [bulkRows, setBulkRows] = React.useState([])
    const [invalidData, setInvalidData] = React.useState([])
    const [bulkModelOpen, setBulkModelOpen] = React.useState(false)

    const handleOpen = () => setOpen(true);
    const handleClose = () => setOpen(false);

    const fetchData = async () => {
        try {
            setLoadData(true)
            const response = await getAllContacts();
            let filteredRows = response.data;
            if (searchValue.trim() !== '') {
                filteredRows = response.data.filter(row =>
                    row.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                    row.tags.some(tag => tag.toLowerCase().includes(searchValue.toLowerCase()))
                );
            }
            if (searchValue.trim() == '') {
                setInitialRows(response.data)
            }
            
                setInitialRows(filteredRows);
            
        } catch (error) {
            console.log(error);
        }
        finally {
            setLoadData(false)
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    const columns = [
        { field: '_id', headerName: 'ID' },
        { field: 'name', headerName: 'Name' },
        { field: 'email', headerName: 'Email', width: 300 },
        { field: 'phone', headerName: 'Phone', type: 'number' },
        { field: 'tags', headerName: 'Tags', description: 'This column has a value getter and is not sortable.', width: 200 },
        { field: 'city', headerName: 'City' },
        { field: 'state', headerName: 'State' },
        { field: 'country', headerName: 'Country' },
        {
            field: 'actions',
            headerName: 'Actions',
            width: 150,
            renderCell: (params) => (
                <div className='flex items-center justify-center h-full gap-2'>
                    <BasicModal
                        type="Edit"
                        id={params.row._id}
                        name={params.row.name}
                        email={params.row.email}
                        phone={params.row.phone}
                        tags={params.row.tags}
                        city={params.row.city}
                        state={params.row.state}
                        country={params.row.country}
                        addData={handleUpdate}
                    />
                    <Button variant="contained" color="secondary" sx={{ bgcolor: "red", margin: "8px" }} size="small" onClick={() => handleDelete(params.row._id)}>Delete</Button>
                </div>
            ),
        },
    ];


    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();

        // Wrap the reader.onload in a Promise
        const onLoadPromise = new Promise((resolve, reject) => {
            reader.onload = (e) => {
                resolve(e);
            };
            reader.onerror = (err) => {
                reject(err);
            };
        });

        reader.readAsArrayBuffer(file);

        onLoadPromise.then(async (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const excelData = XLSX.utils.sheet_to_json(worksheet);

            const rows = excelData.map((row, index) => ({
                // _id: index + 1,
                name: row.Name,
                email: row.Email,
                phone: row.Phone,
                tags: row.Tags.split(','),
                city: row.City,
                state: row.State,
                country: row.Country,
            }));


            rows.forEach((elem, idx) => {
                if (!elem.name && !elem.phone) {
                    setInvalidData((prevData) => [...prevData,
                    {
                        rowNumber: idx + 1,
                        name: "Please add Name",
                        phone: "Please Add Phone",
                        email: elem.email,
                        tags: elem.tags,
                        city: elem.city,
                        state: elem.state,
                        country: elem.country
                    }])
                }
                else if (!elem.name) {
                    setInvalidData((prevData) => [...prevData,
                    {
                        rowNumber: idx + 1,
                        name: "Please add Name",
                        phone: elem.phone,
                        email: elem.email,
                        tags: elem.tags,
                        city: elem.city,
                        state: elem.state,
                        country: elem.country
                    }])
                }
                else if (!elem.phone) {
                    setInvalidData((prevData) => [...prevData,
                    {
                        rowNumber: idx + 1,
                        phone: "Please add Phone",
                        name: elem.name,
                        email: elem.email,
                        tags: elem.tags,
                        city: elem.city,
                        state: elem.state,
                        country: elem.country
                    }])
                }
            })
            setBulkRows(rows.filter((elem) => elem.name && elem.phone))

            if (invalidData) setBulkModelOpen(true)
            try {
                if (!invalidData) {
                    let response = await bulkAdd(rows)
                    if (response.status == '201') {
                        setInitialRows((prevRows) => [...prevRows, ...response.data]);
                    }
                    else {
                        throw new Error("Unable to Bulk Add. Please check the data");
                    }
                }
            } catch (error) {
                console.log(error);
            }
            finally {
                handleClose();
            }
        }).catch((err) => {
            console.error("File reading error:", err);
        }
        );
    };

    const handleDelete = async (id) => {
        //Handle Delete here

        try {
            let response = await deleteContact(id)
            if (response.status == '204') {
                setInitialRows((prevRows) => prevRows.filter((row) => row._id !== id));
            }
            else {
                throw new Error("Unable to delete")
            }
        } catch (error) {
            console.log(error);
        }
    };

    const handleAddOne = async (data) => {
        //Handle Add here
        if (!data.email) {
            data.email = "unset"
        }
        if (!data.city) {
            data.city = 'unset'
        }
        if (!data.state) {
            data.state = 'unset'
        }
        if (!data.country) {
            data.country = 'unset'
        }
        try {
            let response = await addContact(data)
            if (response.status == '201') {
                setInitialRows((prevRows) => [...prevRows, response.data]);
            }
            else {
                throw new Error("Data Adding Failed")
            }
        } catch (error) {
            console.log(error);
        }

    };

    const handleUpdate = async (data, id) => {

        //Handling updates here
        try {
            let response = await editContact(data, id)
            if (response.status == '200') {
                setInitialRows((prevRows) =>
                    prevRows.map((row) => (row._id === id ? { ...row, ...data } : row))
                );
            }
            else {
                throw new Error("Unable to Update")
            }
        } catch (error) {
            console.log(error);
        }

    };


    const handleSearch = async (e) => {
        setSearchValue(e.target.value);
        fetchData(); // Trigger search
    };

    const handleBulkSubmit = async (validData) => {
        try {
            // Remove 'rowNumber' property and convert 'phone' property to number where applicable
            const formattedValidData = validData.map(({ rowNumber, ...data }) => ({
                ...data,
                phone: typeof data.phone === 'string' ? parseInt(data.phone) : data.phone
            }));

            let response = await bulkAdd([...formattedValidData, ...bulkRows]);
            if (response.status == '201') {
                setInitialRows((prevRows) => [...prevRows, ...response.data]);
                setInvalidData([]);
                setBulkRows([]);
            } else {
                throw new Error("Unable to Bulk Add. Please check the data");
            }
        } catch (error) {
            console.log(error);
        }
    };

    const handleBulkClose = () => {
        window.location.reload();
    }


    return (
        <>

            <div>
                <div className='w-full flex justify-center'>
                    <SearchBar searchValue={searchValue} handleSearch={handleSearch} />
                </div>
                <Button variant="contained" color="primary" onClick={handleOpen}>Bulk Upload</Button>

                <Modal open={open} onClose={handleClose} sx={{ display: "flex", border: "solid green 10px", alignItems: "center", justifyContent: "center" }}>
                    <Box sx={{
                        width: 500,
                        height: 200,
                        bgcolor: 'background.paper',
                        border: '2px solid #000',
                        p: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                        <div>
                            <Typography variant="h5">Bulk Upload</Typography>
                            <input type="file" onChange={handleFileUpload} accept=".xlsx,.xls" />
                            <Typography variant="body1">Upload format: Excel (.xlsx, .xls)</Typography>
                        </div>
                    </Box>
                </Modal>


                <div style={{ height: 400, width: '100%' }}>
                    {loadData && (
                        <div className='text-center flex flex-col '>

                            <LinearProgress color="success" />

                        </div>
                    )}

                    <DataGrid
                        rows={loadData ? [] : initialRows}
                        columns={columns}
                        pageSize={5}
                        pagination={{ pageSizeOptions: [5, 10, 20] }}
                        sx={{ padding: "12px" }}
                        getRowId={(row) => row._id}
                    />

                </div>


                <BasicModal type="Add" addData={handleAddOne} />
                <BulkModal isOpen={bulkModelOpen} invalidData={invalidData} bulkSubmit={handleBulkSubmit} handleBulkClose={handleBulkClose} />
            </div>

        </>
    );
};

export default DataTable;
