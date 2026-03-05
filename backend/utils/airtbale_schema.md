
	
pedidos Table
The id for pedidos is tblsGbH2ZZ5CsNc0o. Table ids and table names can be used interchangeably in API requests. Using table ids means table name changes do not require modifications to your API request.

Fields
Each record in the pedidos table contains the following fields:

Field names and field ids can be used interchangeably. Using field ids means field name changes do not require modifications to your API request. We recommend using field ids over field names where possible, to reduce modifications to your API request if the user changes the field name later.

Field NameField IDTypeDescription
PedidofldwjxuudX1ctLxcf
Auto Number
number
Automatically incremented unique counter for each record.
 
Example values
1

2

3

TipoArrozfld0oeYA5Cj7WdVfY
Link to another record
array of record IDs (strings)
Array of linked records IDs from the TipoArroz table.
 
Example value
["rec8116cdd76088af", "rec245db9343f55e8", "rec4f3bade67ff565"]

NombreArrozfldAHaWtvwxWaN90b
Lookup
array of numbers, strings, booleans, or objects
Array of Name fields in linked TipoArroz records.
 
Example values
[
    "Señoret"
]

[
    "Negro"
]

[
    "Abanda"
]

[
    "Pollo y pimientos"
]

[
    "Pollo y pimientos"
]

Precio (from TipoArroz)fldXjK7N4nThyrkyI
Lookup
array of numbers, strings, booleans, or objects
Array of Precio fields in linked TipoArroz records.
 
Example values
[
    13.5
]

[
    13.5
]

[
    12
]

[
    13.5
]

[
    13.5
]

PAXfldklsBgZBmuvqeQTNumber
number
An integer (whole number, e.g. 1, 32, 99). This field only allows positive numbers.
 
Example values
2

2

5

5

7

Observacionesfldv60SlieInzZzk4Long text
string
Multiple lines of text, which may contain "mention tokens", e.g.
<airtable:mention id="menE1i9oBaGX3DseR">@Alex</airtable:mention>
 
Example value
"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vel accumsan orci. Fusce interdum ipsum nec neque iaculis congue. Vivamus bibendum quam at sollicitudin vestibulum. Nunc suscipit nisl sit amet enim hendrerit pellentesque. Curabitur non fermentum orci."
FechaCreacionfld75pOJgrNTF9qXDCreated time
string
The time the record was created in UTC, e.g. "2015-08-29T07:00:00.000Z".
 
Example values
"2024-08-06T15:43:38.000Z"

"2024-08-06T15:44:49.000Z"

"2024-08-06T15:45:01.000Z"

"2024-08-06T15:45:01.000Z"

"2024-08-06T15:45:01.000Z"

Clientefldub0YlSSCCppwDP
Link to another record
array of record IDs (strings)
Array of linked records IDs from the Clientes table.
 
Example value
["rec8116cdd76088af", "rec245db9343f55e8", "rec4f3bade67ff565"]

TelefonoClientefldkBD5v7zHnvClxH
Lookup
array of numbers, strings, booleans, or objects
Array of Telefono fields in linked Clientes records.
 
Example values
[
    "619381274"
]

[
    "619381274"
]

[
    "670245077"
]

[
    "618018764"
]

[
    "660518872"
]

NombreClientefldzkh0zC80pwBIaq
Lookup
array of numbers, strings, booleans, or objects
Array of Nombre fields in linked Clientes records.
 
Example values
[
    "Begoña"
]

[
    "Begoña"
]

[
    "Luis Alberto"
]

[
    "Marta"
]

[
    "Cristina"
]

Codigo Postalfldn9wB93azFv1lUs
Lookup
array of numbers, strings, booleans, or objects
Array of Codigo Postal fields in linked Clientes records.
 
Example values
To see example values, try adding some data to pedidos.

DireccionfldMOf7AnwJQOvVus
Lookup
array of numbers, strings, booleans, or objects
Array of Direccion fields in linked Clientes records.
 
Example values
[
    "Av. Burgos 42, 1ºD"
]

[
    "Av. Burgos 42, 1ºD"
]

[
    "Fermín Caballero 54, 6ºB"
]

[
    "Sarriá 48, 3.1"
]

[
    "Marbella 64, 2ºC"
]

PrecioFinalfldlu7xB5MzRAn0lGFormula
number, string, array of numbers or strings
Computed value: {Precio (from TipoArroz)}*PAX.
 
Example values
27

27

60

67.5

94.5

EntregadofldhN4KzwBBfU6jGy
Checkbox
boolean
This field is "true" when checked and otherwise empty.
 
Example value
true

Fechafldj9p7vQ5mJ5iAtvText
string
A single line of text.
 
Example values
"01/01/2023"

"01/01/2023"

"01/01/2023"

"01/01/2023"

"01/01/2023"

Horafld16rWaRcw1415DxText
string
A single line of text.
 
Example values
"13:30"

"13:30"

"13:30"

"13:30"

"14:15"

LocalfldOUKM4W40Xs3mjM
Checkbox
boolean
This field is "true" when checked and otherwise empty.
 
Example value
true

FechaPedidofldOBJ1bAznsmAMPKFormula
number, string, array of numbers or strings
Computed value: DATETIME_PARSE(CONCATENATE(Fecha,Hora),"DD-MM-YYYY HH:mm").
 
Example values
"2023-01-01T13:30:00.000Z"

"2023-01-01T13:30:00.000Z"

"2023-01-01T13:30:00.000Z"

"2023-01-01T13:30:00.000Z"

"2023-01-01T14:15:00.000Z"

RecogidoflddMo5EpsBUBq1gn
Checkbox
boolean
This field is "true" when checked and otherwise empty.
 
Example value
true

ReviewfldySd701kG7hA2vn
Rating
number
A positive integer (e.g. "3 stars" is 3). A rating cannot be 0.
 
Example value
2

formufldvKvEl6qBUJO4j6Formula
number, string, array of numbers or strings
Computed value: RECORD_ID().
 
Example values
"\\"rec76YSnkuYxCpH8p\\""

"\\"recyr0bYdzces6VS3\\""

"\\"reca8kh3F1WWxYHCp\\""

"\\"recsTQiN6JJhZ6kbR\\""

"\\"reci29U6ZclEeRw5D\\""

ComentariosRecogidafldfmiYW2R5WgUvfvLong text
string
Multiple lines of text, which may contain "mention tokens", e.g.
<airtable:mention id="menE1i9oBaGX3DseR">@Alex</airtable:mention>
 
Example value
"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vel accumsan orci. Fusce interdum ipsum nec neque iaculis congue. Vivamus bibendum quam at sollicitudin vestibulum. Nunc suscipit nisl sit amet enim hendrerit pellentesque. Curabitur non fermentum orci."
CodigoPostalfldCmE5sBsVKSMpyi
Lookup
array of numbers, strings, booleans, or objects
Array of Codigo Postal fields in linked Clientes records.


Clientes Table
The id for Clientes is tblz0Fd7jhVjkYWWH. Table ids and table names can be used interchangeably in API requests. Using table ids means table name changes do not require modifications to your API request.

Fields
Each record in the Clientes table contains the following fields:

Field names and field ids can be used interchangeably. Using field ids means field name changes do not require modifications to your API request. We recommend using field ids over field names where possible, to reduce modifications to your API request if the user changes the field name later.

Field NameField IDTypeDescription
TelefonofldNH1Gtq3LisrlP2Text
string
A single line of text.
 
Example values
"635418291"

"0"

"630965384"

"649024646"

"695054642"

NombrefldAcPhoBnauNGpecText
string
A single line of text.
 
Example values
"Lola Orellana"

"Bravo"

"Rocío Machado"

"Jesús Garrido"

"José Ruiz"

DireccionfldQN5N1Ohp98NWOSText
string
A single line of text.
 
Example values
"La Maso 19"

"Papanegro 129"

"Peña del Sol 15"

"Nuria 11B"

"Badalona 101"

Codigo PostalfldLaToa8c5PgSVeiNumber
number
An integer (whole number, e.g. 1, 32, 99). This field only allows positive numbers.
 
Example value
42

ObervacionesfldPDtUuepTALTetqLong text
string
Multiple lines of text, which may contain "mention tokens", e.g.
<airtable:mention id="menE1i9oBaGX3DseR">@Alex</airtable:mention>
 
Example value
"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vel accumsan orci. Fusce interdum ipsum nec neque iaculis congue. Vivamus bibendum quam at sollicitudin vestibulum. Nunc suscipit nisl sit amet enim hendrerit pellentesque. Curabitur non fermentum orci."
ComandasfldkMiieySwSvdKov
Link to another record
array of record IDs (strings)
Array of linked records IDs from the pedidos table.
 
Example value
["rec8116cdd76088af", "rec245db9343f55e8", "rec4f3bade67ff565"]

buscarTelffldPcGhqJoWOwbpCtFormula
number, string, array of numbers or strings
Computed value: SEARCH("652",Telefono,1)=1.
 
Example values
0

0

0

0

0

NumComandasfldnoEhXsUD05bg0M
Count
number
Number of linked pedidos records.


TipoArroz Table
The id for TipoArroz is tblI4zbZ1snWv9CC9. Table ids and table names can be used interchangeably in API requests. Using table ids means table name changes do not require modifications to your API request.

Fields
Each record in the TipoArroz table contains the following fields:

Field names and field ids can be used interchangeably. Using field ids means field name changes do not require modifications to your API request. We recommend using field ids over field names where possible, to reduce modifications to your API request if the user changes the field name later.

Field NameField IDTypeDescription
NamefldguLXFHeX5LDWDQText
string
A single line of text.
 
Example values
"Abanda"

"Negro"

"Alcachofas"

"Valenciana"

"Señoret"

Preciofldgj33o7jQHk0yp5Currency
number
Currency value. This field only allows positive numbers.
 
Example values
12.00

13.50

13.50

13.50

13.50

CaldofldFYohnfQifqNTLXText
string
A single line of text.
 
Example values
"Pescado"

"Pescado"

"Pescado"

"Paella"

"Pescado"

ComandasfldT3eT2RIi1zMwdu
Link to another record
array of record IDs (strings)
Array of linked records IDs from the pedidos table.
 
Example value
["rec8116cdd76088af", "rec245db9343f55e8", "rec4f3bade67ff565"]

CalculationfldSSCtZ7wnUdPuB0Formula
number, string, array of numbers or strings
Computed value: RECORD_ID().